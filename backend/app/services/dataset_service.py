import math
from pathlib import Path
from typing import Optional, Dict, Any, List
import numpy as np
import pandas as pd
from backend.app.core.config import get_default_csv_path, DATA_DIR

_DF_CACHE: Dict[str, pd.DataFrame] = {}

def get_raw_dataframe(csv_path: Optional[str] = None, reload: bool = False) -> pd.DataFrame:
    path = Path(csv_path) if csv_path else get_default_csv_path()
    path_str = str(path)
    if not reload and path_str in _DF_CACHE:
        return _DF_CACHE[path_str]

    if not path.exists():
        raise FileNotFoundError(f"Dataset file not found at: {path}")

    df = pd.read_csv(path, encoding="latin-1", dtype={"InvoiceNo": str, "StockCode": str})
    # Parse date safely
    try:
        df["InvoiceDate"] = pd.to_datetime(df["InvoiceDate"], format="%m/%d/%Y %H:%M")
    except Exception:
        df["InvoiceDate"] = pd.to_datetime(df["InvoiceDate"])

    _DF_CACHE[path_str] = df
    return df

def profile_dataset(csv_path: Optional[str] = None) -> Dict[str, Any]:
    df = get_raw_dataframe(csv_path)

    total_rows = int(df.shape[0])
    total_cols = int(df.shape[1])
    cols = list(df.columns)

    attribute_kinds = {
        "InvoiceNo": "nominal",
        "StockCode": "nominal",
        "Description": "nominal (text)",
        "Quantity": "numeric (ratio)",
        "InvoiceDate": "date-time (interval)",
        "UnitPrice": "numeric (ratio)",
        "CustomerID": "nominal (id)",
        "Country": "nominal",
    }

    col_types = {c: str(df[c].dtype) for c in cols}

    missing_counts = {c: int(df[c].isnull().sum()) for c in cols}
    missing_pcts = {c: round(float((df[c].isnull().sum() / total_rows) * 100), 2) for c in cols}

    unique_counts = {c: int(df[c].nunique()) for c in cols}

    numeric_cols = ["Quantity", "UnitPrice"]
    stats_df = df[numeric_cols].describe()
    numeric_stats: Dict[str, Dict[str, float]] = {}
    for c in numeric_cols:
        numeric_stats[c] = {
            "count": float(stats_df.loc["count", c]),
            "mean": round(float(stats_df.loc["mean", c]), 2),
            "std": round(float(stats_df.loc["std", c]), 2),
            "min": round(float(stats_df.loc["min", c]), 2),
            "25%": round(float(stats_df.loc["25%", c]), 2),
            "50%": round(float(stats_df.loc["50%", c]), 2),
            "75%": round(float(stats_df.loc["75%", c]), 2),
            "max": round(float(stats_df.loc["max", c]), 2),
        }

    date_range = {
        "start": str(df["InvoiceDate"].min().date()),
        "end": str(df["InvoiceDate"].max().date()),
    }

    cancelled_count = int(df["InvoiceNo"].astype(str).str.startswith("C").sum())

    skewness = {
        "Quantity": round(float(df["Quantity"].skew()), 2),
        "UnitPrice": round(float(df["UnitPrice"].skew()), 2),
    }

    country_counts = df["Country"].value_counts().head(10)
    top_countries = [
        {"country": str(c), "count": int(v), "percentage": round(float((v / total_rows) * 100), 2)}
        for c, v in country_counts.items()
    ]

    sample_rows = (
        df.head(20)
        .assign(InvoiceDate=lambda d: d["InvoiceDate"].dt.strftime("%Y-%m-%d %H:%M"))
        .fillna({"Description": "UNKNOWN", "CustomerID": 0})
        .to_dict(orient="records")
    )

    # Histogram & Boxplot data for positive Quantity and UnitPrice
    valid = df[(df["Quantity"] > 0) & (df["UnitPrice"] > 0)]
    
    # log10 UnitPrice histogram
    log_prices = np.log10(valid["UnitPrice"])
    p_hist, p_edges = np.histogram(log_prices, bins=25)
    hist_unit_price = [
        {"bin": f"{10**p_edges[i]:.2f} - {10**p_edges[i+1]:.2f}", "count": int(p_hist[i])}
        for i in range(len(p_hist))
    ]

    # log10 Quantity histogram
    log_qty = np.log10(valid["Quantity"])
    q_hist, q_edges = np.histogram(log_qty, bins=25)
    hist_quantity = [
        {"bin": f"{int(10**q_edges[i])} - {int(10**q_edges[i+1])}", "count": int(q_hist[i])}
        for i in range(len(q_hist))
    ]

    # Boxplot quantiles for clipped Quantity & UnitPrice (99th percentile)
    q_clip = valid["Quantity"].clip(upper=valid["Quantity"].quantile(0.99))
    u_clip = valid["UnitPrice"].clip(upper=valid["UnitPrice"].quantile(0.99))

    boxplots = {
        "Quantity": {
            "min": float(q_clip.min()),
            "q1": float(q_clip.quantile(0.25)),
            "median": float(q_clip.median()),
            "q3": float(q_clip.quantile(0.75)),
            "max": float(q_clip.max()),
            "clipped_at_99th": float(valid["Quantity"].quantile(0.99)),
        },
        "UnitPrice": {
            "min": float(u_clip.min()),
            "q1": float(u_clip.quantile(0.25)),
            "median": float(u_clip.median()),
            "q3": float(u_clip.quantile(0.75)),
            "max": float(u_clip.max()),
            "clipped_at_99th": float(valid["UnitPrice"].quantile(0.99)),
        },
    }

    return {
        "filepath": str(csv_path or get_default_csv_path()),
        "total_rows": total_rows,
        "total_columns": total_cols,
        "columns": cols,
        "column_types": col_types,
        "attribute_kinds": attribute_kinds,
        "missing_values": missing_counts,
        "missing_percentages": missing_pcts,
        "unique_counts": unique_counts,
        "numeric_stats": numeric_stats,
        "date_range": date_range,
        "cancelled_count": cancelled_count,
        "skewness": skewness,
        "top_countries": top_countries,
        "sample_rows": sample_rows,
        "histograms": {
            "unit_price_log10": hist_unit_price,
            "quantity_log10": hist_quantity,
        },
        "boxplots": boxplots,
    }
