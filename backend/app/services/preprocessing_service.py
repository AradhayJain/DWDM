from typing import Optional, Dict, Any, List
import numpy as np
import pandas as pd
from .dataset_service import get_raw_dataframe

def preprocess_dataset(
    csv_path: Optional[str] = None,
    impute_description: bool = True,
    guest_customer_handling: str = "zero",
    remove_duplicates: bool = True,
    remove_cancellations: bool = True,
    remove_invalid_prices: bool = True,
    binning_feature: str = "UnitPrice",
    binning_samples: int = 20,
    normalization_feature: str = "Quantity"
) -> Dict[str, Any]:
    raw_df = get_raw_dataframe(csv_path)
    df = raw_df.copy()

    original_count = int(len(df))
    missing_before = {c: int(df[c].isnull().sum()) for c in df.columns if df[c].isnull().sum() > 0}

    # 1. Handling missing values
    guest_checkouts = int(df["CustomerID"].isnull().sum())
    if impute_description:
        mode_desc = (
            df.dropna(subset=["Description"])
            .groupby("StockCode")["Description"]
            .agg(lambda s: s.mode()[0] if len(s.mode()) > 0 else "UNKNOWN")
        )
        df["Description"] = df["Description"].fillna(df["StockCode"].map(mode_desc)).fillna("UNKNOWN")

    if guest_customer_handling == "zero":
        df["CustomerID"] = df["CustomerID"].fillna(0).astype(int)
    else:
        df = df.dropna(subset=["CustomerID"])
        df["CustomerID"] = df["CustomerID"].astype(int)

    missing_after = {c: int(df[c].isnull().sum()) for c in df.columns}

    # 2. Duplicate detection
    duplicates_removed = 0
    if remove_duplicates:
        n_prev = len(df)
        df = df.drop_duplicates()
        duplicates_removed = int(n_prev - len(df))

    # 3. Cancellations
    cancellations_removed = 0
    if remove_cancellations:
        cancel_mask = df["InvoiceNo"].astype(str).str.startswith("C")
        cancellations_removed = int(cancel_mask.sum())
        df = df[~cancel_mask]

    # 4. Invalid quantities / prices
    invalid_removed = 0
    if remove_invalid_prices:
        bad_mask = (df["Quantity"] <= 0) | (df["UnitPrice"] <= 0)
        invalid_removed = int(bad_mask.sum())
        df = df[~bad_mask].copy()

    final_count = int(len(df))

    # 5. Binning Smoothing (Experiment 2)
    feat = binning_feature if binning_feature in df.columns else "UnitPrice"
    x = df[feat].sample(min(binning_samples, len(df)), random_state=4).sort_values().reset_index(drop=True)
    n_bins = 5
    b = pd.qcut(x.rank(method="first"), n_bins, labels=False)
    by_mean = x.groupby(b).transform("mean").round(2)
    by_median = x.groupby(b).transform("median").round(2)
    by_bound = x.groupby(b).transform(
        lambda s: s.apply(lambda v: s.min() if abs(v - s.min()) <= abs(v - s.max()) else s.max())
    ).round(2)

    smoothing_table = [
        {
            "index": int(i),
            feat: round(float(x.iloc[i]), 2),
            "bin": int(b.iloc[i]),
            "bin_mean": float(by_mean.iloc[i]),
            "bin_median": float(by_median.iloc[i]),
            "bin_boundary": float(by_bound.iloc[i]),
        }
        for i in range(len(x))
    ]

    # 6. Normalization (Experiment 2)
    norm_col = normalization_feature if normalization_feature in df.columns else "Quantity"
    v = df[norm_col].astype(float)
    min_v, max_v = float(v.min()), float(v.max())
    mean_v, std_v = float(v.mean()), float(v.std())
    
    minmax = (v - min_v) / (max_v - min_v) if (max_v - min_v) != 0 else v
    zscore = (v - mean_v) / std_v if std_v != 0 else v
    j = len(str(int(v.abs().max()))) if not v.empty else 1
    decimal = v / (10 ** j)

    norm_df = pd.DataFrame({
        norm_col: v,
        "min_max": minmax,
        "z_score": zscore,
        "decimal": decimal
    })

    sample_norm = (
        norm_df.head(10)
        .round(4)
        .reset_index(drop=True)
        .to_dict(orient="records")
    )

    desc = norm_df.describe().loc[["mean", "std", "min", "max"]].round(4).to_dict()

    return {
        "original_count": original_count,
        "missing_before": missing_before,
        "missing_after": missing_after,
        "guest_checkouts": guest_checkouts,
        "duplicates_removed": duplicates_removed,
        "cancellations_removed": cancellations_removed,
        "invalid_removed": invalid_removed,
        "final_count": final_count,
        "smoothing_table": smoothing_table,
        "normalization_sample": sample_norm,
        "normalization_summary": desc,
        "decimal_scaling_power": j,
    }
