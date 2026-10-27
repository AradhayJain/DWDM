import math
from pathlib import Path
from typing import Optional, Dict, Any, List
import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN
from backend.app.core.config import DATA_DIR
from .dataset_service import get_raw_dataframe

def haversine_distance_matrix(coords: np.ndarray) -> np.ndarray:
    """Computes pairwise Great-Circle distances in kilometers."""
    # coords shape: (N, 2) in [lat, lon] degrees
    R = 6371.0 # Earth radius in km
    lat = np.radians(coords[:, 0])
    lon = np.radians(coords[:, 1])

    dlat = lat[:, None] - lat[None, :]
    dlon = lon[:, None] - lon[None, :]

    a = np.sin(dlat / 2.0) ** 2 + np.cos(lat[:, None]) * np.cos(lat[None, :]) * np.sin(dlon / 2.0) ** 2
    c = 2 * np.arcsin(np.sqrt(np.clip(a, 0, 1)))
    return R * c

def analyze_spatial_database(
    retail_csv_path: Optional[str] = None,
    spatial_csv_path: Optional[str] = None,
    use_sample_if_none: bool = True,
    dbscan_eps_km: float = 150.0,
    dbscan_min_points: int = 2
) -> Dict[str, Any]:
    # 1. Retail Geographic Distribution
    raw_df = get_raw_dataframe(retail_csv_path)
    filt = (
        ~raw_df["InvoiceNo"].astype(str).str.startswith("C")
        & (raw_df["Quantity"] > 0)
        & (raw_df["UnitPrice"] > 0)
    )
    sales = raw_df[filt].copy()
    sales["revenue"] = sales["Quantity"] * sales["UnitPrice"]

    country_rev = (
        sales.groupby("Country")
        .agg(revenue=("revenue", "sum"), orders=("InvoiceNo", "nunique"), customers=("CustomerID", "nunique"))
        .sort_values("revenue", ascending=False)
        .head(15)
        .reset_index()
    )
    retail_country_rev = [
        {
            "country": str(r["Country"]),
            "revenue": round(float(r["revenue"]), 2),
            "orders": int(r["orders"]),
            "customers": int(r["customers"])
        }
        for _, r in country_rev.iterrows()
    ]

    # Region mapping
    region_map = {
        "United Kingdom": "UK", "Germany": "Europe", "France": "Europe", "EIRE": "Europe",
        "Spain": "Europe", "Netherlands": "Europe", "Belgium": "Europe", "Switzerland": "Europe",
        "Portugal": "Europe", "Australia": "Asia-Pacific", "Japan": "Asia-Pacific", "USA": "Americas"
    }
    rg = sales["Country"].map(region_map).fillna("Other")
    reg_rev = (sales.groupby(rg)["revenue"].sum() / sales["revenue"].sum()).round(4)
    regional_share = [{"region": str(k), "share": float(v)} for k, v in reg_rev.items()]

    # 2. Spatial Dataset Coordinates Analysis
    s_path = Path(spatial_csv_path) if spatial_csv_path else None
    if not s_path or not s_path.exists():
        if use_sample_if_none:
            s_path = DATA_DIR / "sample_spatial_retail.csv"
        else:
            return {
                "mode": "retail_geographic_only",
                "total_locations": 0,
                "valid_coordinates_count": 0,
                "bounding_box": {},
                "locations": [],
                "spatial_clusters": [],
                "retail_country_revenue": retail_country_rev,
                "regional_share": regional_share,
                "note": "No coordinate dataset supplied. Showing retail country-level distribution."
            }

    sp_df = pd.read_csv(s_path)
    # Check for latitude/longitude columns (case-insensitive)
    cols_lower = {c.lower(): c for c in sp_df.columns}
    lat_col = cols_lower.get("latitude") or cols_lower.get("lat")
    lon_col = cols_lower.get("longitude") or cols_lower.get("lon") or cols_lower.get("lng")

    if not lat_col or not lon_col:
        raise ValueError("Spatial CSV must contain valid 'latitude' and 'longitude' columns.")

    # Validate coordinates
    valid_mask = (
        sp_df[lat_col].notnull() & sp_df[lon_col].notnull()
        & (sp_df[lat_col] >= -90.0) & (sp_df[lat_col] <= 90.0)
        & (sp_df[lon_col] >= -180.0) & (sp_df[lon_col] <= 180.0)
    )
    clean_sp = sp_df[valid_mask].copy()

    coords = clean_sp[[lat_col, lon_col]].values.astype(float)
    dist_matrix = haversine_distance_matrix(coords)

    # Spatial DBSCAN with metric='precomputed'
    db = DBSCAN(eps=dbscan_eps_km, min_samples=dbscan_min_points, metric="precomputed").fit(dist_matrix)
    clean_sp["cluster"] = db.labels_

    bbox = {
        "min_lat": round(float(coords[:, 0].min()), 4),
        "max_lat": round(float(coords[:, 0].max()), 4),
        "min_lon": round(float(coords[:, 1].min()), 4),
        "max_lon": round(float(coords[:, 1].max()), 4),
    }

    locations = []
    for idx, row in clean_sp.iterrows():
        locations.append({
            "name": str(row.get("store_name", row.get("city", f"Point {idx}"))),
            "city": str(row.get("city", "")),
            "country": str(row.get("country", "")),
            "latitude": round(float(row[lat_col]), 4),
            "longitude": round(float(row[lon_col]), 4),
            "cluster_id": int(row["cluster"]),
            "is_outlier": bool(row["cluster"] == -1)
        })

    cluster_counts = clean_sp["cluster"].value_counts()
    spatial_clusters = [
        {
            "cluster_id": int(c_id),
            "name": f"Spatial Hub {c_id}" if c_id != -1 else "Geographic Outliers / Remote",
            "point_count": int(count),
            "is_noise": bool(c_id == -1)
        }
        for c_id, count in cluster_counts.items()
    ]

    return {
        "mode": "spatial_coordinate_dbscan",
        "total_locations": len(sp_df),
        "valid_coordinates_count": len(clean_sp),
        "bounding_box": bbox,
        "locations": locations,
        "spatial_clusters": spatial_clusters,
        "retail_country_revenue": retail_country_rev,
        "regional_share": regional_share,
    }
