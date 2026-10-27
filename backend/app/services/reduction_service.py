from typing import Optional, Dict, Any, List, Tuple
import numpy as np
import pandas as pd
from sklearn.feature_selection import mutual_info_classif, RFE
from sklearn.linear_model import LogisticRegression
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler, KBinsDiscretizer
from .dataset_service import get_raw_dataframe

def build_customer_features(
    df: pd.DataFrame, cutoff_date: str = "2011-09-01"
) -> Tuple[pd.DataFrame, pd.Series, pd.DataFrame]:
    CUTOFF = pd.Timestamp(cutoff_date)

    cancelled = df["InvoiceNo"].astype(str).str.startswith("C")
    sales = df[~cancelled & (df["Quantity"] > 0) & (df["UnitPrice"] > 0)].dropna(subset=["CustomerID"]).drop_duplicates()
    sales = sales.assign(Revenue=sales["Quantity"] * sales["UnitPrice"])
    returns = df[cancelled].dropna(subset=["CustomerID"])

    past = sales[sales["InvoiceDate"] < CUTOFF]
    future = sales[sales["InvoiceDate"] >= CUTOFF]

    cust = past.groupby("CustomerID").agg(
        recency=("InvoiceDate", lambda s: int((CUTOFF - s.max()).days)),
        tenure=("InvoiceDate", lambda s: int((CUTOFF - s.min()).days)),
        frequency=("InvoiceNo", "nunique"),
        monetary=("Revenue", "sum"),
        total_qty=("Quantity", "sum"),
        n_products=("StockCode", "nunique"),
        avg_unit_price=("UnitPrice", "mean"),
    )

    cust["avg_basket"] = cust["monetary"] / cust["frequency"]
    
    ret_past = returns[returns["InvoiceDate"] < CUTOFF].groupby("CustomerID")["InvoiceNo"].nunique()
    cust["n_returns"] = ret_past.reindex(cust.index).fillna(0).astype(int)

    is_uk_series = past.groupby("CustomerID")["Country"].agg(lambda s: int(s.iloc[0] == "United Kingdom"))
    cust["is_uk"] = is_uk_series.reindex(cust.index).fillna(0).astype(int)

    cust["active_next"] = cust.index.isin(future["CustomerID"]).astype(int)

    X = cust.drop(columns="active_next")
    y = cust["active_next"]

    return X, y, sales

def reduce_features(
    csv_path: Optional[str] = None,
    cutoff_date: str = "2011-09-01",
    discretization_bins: int = 4,
    n_pca_components: int = 2,
    rfe_features: int = 4
) -> Dict[str, Any]:
    raw_df = get_raw_dataframe(csv_path)
    X, y, sales = build_customer_features(raw_df, cutoff_date)

    # 1. Mutual Information
    mi = mutual_info_classif(X, y, random_state=1)
    mi_scores = [
        {"feature": str(col), "importance": round(float(score), 4)}
        for col, score in sorted(zip(X.columns, mi), key=lambda x: x[1], reverse=True)
    ]

    # 2. RFE
    Xs = StandardScaler().fit_transform(X)
    rfe = RFE(LogisticRegression(max_iter=1000), n_features_to_select=rfe_features).fit(Xs, y)
    rfe_selected = list(X.columns[rfe.support_])

    # 3. Multicollinearity
    corr = X.corr()
    redundant_pairs = []
    cols = list(X.columns)
    for i, a in enumerate(cols):
        for b in cols[i + 1:]:
            r_val = float(corr.loc[a, b])
            if abs(r_val) > 0.8:
                redundant_pairs.append({
                    "feature_1": str(a),
                    "feature_2": str(b),
                    "correlation": round(r_val, 3)
                })

    # 4. PCA
    pca = PCA().fit(Xs)
    evr = [round(float(v), 4) for v in pca.explained_variance_ratio_]
    cum_evr = [round(float(v), 4) for v in np.cumsum(pca.explained_variance_ratio_)]
    comp_90 = int(np.argmax(np.array(cum_evr) >= 0.90) + 1)

    loadings = []
    for i in range(min(n_pca_components, len(pca.components_))):
        load_dict = {"component": f"PC{i+1}"}
        for col, val in zip(X.columns, pca.components_[i]):
            load_dict[col] = round(float(val), 3)
        loadings.append(load_dict)

    # 5. Discretization
    col_mon = X[["monetary"]]
    ew = KBinsDiscretizer(n_bins=discretization_bins, encode="ordinal", strategy="uniform").fit(col_mon)
    ef = KBinsDiscretizer(n_bins=discretization_bins, encode="ordinal", strategy="quantile").fit(col_mon)

    ew_edges = [round(float(e), 1) for e in ew.bin_edges_[0]]
    ef_edges = [round(float(e), 1) for e in ef.bin_edges_[0]]

    ew_counts = [int(c) for c in np.bincount(ew.transform(col_mon).ravel().astype(int))]
    ef_counts = [int(c) for c in np.bincount(ef.transform(col_mon).ravel().astype(int))]

    # 6. Concept Hierarchies
    spend_level = pd.qcut(X["monetary"], [0, 0.25, 0.75, 0.95, 1], labels=["low", "medium", "high", "top"])
    ct = pd.crosstab(spend_level, y, margins=True)
    ct_dict = {
        "index": list(ct.index),
        "lapsed_0": [int(x) for x in ct[0]],
        "active_1": [int(x) for x in ct[1]],
        "total": [int(x) for x in ct["All"]],
    }

    # Time hierarchy sample
    time_sample = (
        sales.sample(min(5, len(sales)), random_state=2)[["InvoiceDate"]]
        .assign(
            day=lambda t: t.InvoiceDate.dt.strftime("%Y-%m-%d"),
            month=lambda t: t.InvoiceDate.dt.strftime("%Y-%m"),
            quarter=lambda t: t.InvoiceDate.dt.to_period("Q").astype(str),
            year=lambda t: t.InvoiceDate.dt.year.astype(int)
        )
        .drop(columns="InvoiceDate")
        .to_dict(orient="records")
    )

    # Location hierarchy
    region_map = {
        "United Kingdom": "UK", "Germany": "Europe", "France": "Europe", "EIRE": "Europe",
        "Spain": "Europe", "Netherlands": "Europe", "Belgium": "Europe", "Switzerland": "Europe",
        "Portugal": "Europe"
    }
    rg = sales["Country"].map(region_map).fillna("Rest of world")
    rev_by_region = (sales.groupby(rg)["Revenue"].sum() / sales["Revenue"].sum()).round(4)
    loc_hierarchy = [
        {"region": str(k), "revenue_share": float(v)}
        for k, v in rev_by_region.items()
    ]

    return {
        "customer_count": int(len(X)),
        "attribute_count": int(X.shape[1]),
        "class_balance": {str(k): int(v) for k, v in y.value_counts().items()},
        "mutual_info_scores": mi_scores,
        "rfe_selected_features": rfe_selected,
        "redundant_pairs": redundant_pairs,
        "pca_explained_variance": evr,
        "pca_cumulative_variance": cum_evr,
        "pca_90_variance_components": comp_90,
        "pca_loadings": loadings,
        "discretization_equal_width": {"edges": ew_edges, "counts": ew_counts},
        "discretization_equal_freq": {"edges": ef_edges, "counts": ef_counts},
        "spend_level_crosstab": ct_dict,
        "time_hierarchy_samples": time_sample,
        "location_hierarchy": loc_hierarchy,
    }
