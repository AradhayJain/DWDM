import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
from sqlalchemy import text
from backend.app.core.config import DATA_DIR, REPORTS_DIR, EXPORTS_DIR, get_default_csv_path
from backend.app.core.database import engine, Base
from backend.app.models.warehouse import (
    DimDate, DimProduct, DimCustomer, FactSales,
    DimRegion, DimCountry, SnowCustomer, DimPriceBand, SnowProduct, SnowFactSales
)

logger = logging.getLogger("retail_dw.etl")

DEFAULT_PRICE_BANDS = pd.DataFrame({
    "band_id": [1, 2, 3, 4],
    "price_band": ["Budget", "Economy", "Standard", "Premium"],
    "min_price": [0.0, 1.0, 3.0, 10.0],
    "max_price": [1.0, 3.0, 10.0, 100000.0]
})

def run_etl_pipeline(csv_path: Optional[str] = None) -> Dict[str, Any]:
    logger.info("Starting ETL Pipeline...")
    source_file = Path(csv_path) if csv_path else get_default_csv_path()
    if not source_file.exists():
        raise FileNotFoundError(f"Source CSV not found: {source_file}")

    # Step 0: Ensure tables exist
    Base.metadata.create_all(bind=engine)

    # Step 1: Extract
    sales = pd.read_csv(source_file, encoding="latin-1", dtype={"InvoiceNo": str, "StockCode": str})
    raw_count = len(sales)

    # Load country_region.json
    region_json_path = DATA_DIR / "country_region.json"
    if region_json_path.exists():
        country_region = pd.read_json(region_json_path)
    else:
        country_region = pd.DataFrame(columns=["country", "region"])

    bands = DEFAULT_PRICE_BANDS

    # Step 2: Transform & Clean
    stages = [("Extracted", raw_count)]
    rejects: List[pd.DataFrame] = []

    def reject(mask: pd.Series, reason: str):
        nonlocal sales
        n_rej = int(mask.sum())
        if n_rej > 0:
            rejects.append(sales[mask].assign(reason=reason))
            sales = sales[~mask]
        stages.append((reason, len(sales)))

    # Reject duplicates
    reject(sales.duplicated(), "duplicate records")

    # Reject cancellations
    reject(sales["InvoiceNo"].astype(str).str.startswith("C"), "cancelled invoices (returns)")

    # Reject bad quantity / price
    reject((sales["Quantity"] <= 0) | (sales["UnitPrice"] <= 0), "non-positive quantity or price")

    # Clean stock code
    sales["StockCode"] = sales["StockCode"].astype(str).str.strip().str.upper()
    non_merch = {"POST", "D", "M", "BANK CHARGES", "DOT", "CRUCIAL", "C2", "AMAZONFEE", "S", "B", "PADS"}
    reject(sales["StockCode"].isin(non_merch), "non-merchandise codes (postage/fees)")

    # Date parsing
    try:
        sales["InvoiceDate"] = pd.to_datetime(sales["InvoiceDate"], format="%m/%d/%Y %H:%M")
    except Exception:
        sales["InvoiceDate"] = pd.to_datetime(sales["InvoiceDate"])

    # Descriptions
    sales["Description"] = sales["Description"].fillna("").astype(str).str.strip().str.upper()
    mode_desc = (
        sales[sales["Description"] != ""]
        .groupby("StockCode")["Description"]
        .agg(lambda s: s.mode()[0] if len(s.mode()) > 0 else "UNKNOWN")
    )
    sales["Description"] = sales["Description"].replace("", np.nan).fillna(sales["StockCode"].map(mode_desc)).fillna("UNKNOWN")

    # Customer ID
    sales["CustomerID"] = pd.to_numeric(sales["CustomerID"], errors="coerce").fillna(0).astype(int)

    # Country standardization
    country_map = {"EIRE": "Ireland", "RSA": "South Africa", "USA": "United States", "Unspecified": "Unknown"}
    sales["Country"] = sales["Country"].fillna("Unknown").astype(str).str.strip().replace(country_map)

    # Derived attributes
    sales["revenue"] = (sales["Quantity"] * sales["UnitPrice"]).round(2)
    sales["date_id"] = sales["InvoiceDate"].dt.strftime("%Y%m%d").astype(int)

    # Build DimDate
    unique_dates = sorted(sales["InvoiceDate"].dt.normalize().unique())
    dim_date_df = pd.DataFrame({"full_date": unique_dates})
    dim_date_df["date_id"] = dim_date_df["full_date"].dt.strftime("%Y%m%d").astype(int)
    dim_date_df["day"] = dim_date_df["full_date"].dt.day
    dim_date_df["month"] = dim_date_df["full_date"].dt.month
    dim_date_df["month_name"] = dim_date_df["full_date"].dt.strftime("%b")
    dim_date_df["quarter"] = dim_date_df["full_date"].dt.quarter
    dim_date_df["year"] = dim_date_df["full_date"].dt.year
    dim_date_df["weekday"] = dim_date_df["full_date"].dt.day_name()
    dim_date_df["full_date"] = dim_date_df["full_date"].dt.date

    # Build DimProduct
    prod_agg = sales.groupby("StockCode").agg(
        description=("Description", lambda s: s.mode()[0] if len(s.mode()) > 0 else "UNKNOWN"),
        avg_price=("UnitPrice", "mean")
    ).reset_index()
    prod_agg["product_id"] = np.arange(1, len(prod_agg) + 1)

    edges = [0.0] + list(bands["max_price"])
    prod_agg["price_band"] = pd.cut(prod_agg["avg_price"], edges, labels=bands["price_band"]).astype(str)
    dim_product_df = prod_agg[["product_id", "StockCode", "description", "price_band"]].rename(
        columns={"StockCode": "stock_code"}
    )

    # Build DimCustomer
    cust_mode_country = sales.groupby("CustomerID")["Country"].agg(lambda s: s.mode()[0]).reset_index()
    if not country_region.empty:
        dim_customer_df = cust_mode_country.merge(country_region, left_on="Country", right_on="country", how="left")
        dim_customer_df["region"] = dim_customer_df["region"].fillna("Other")
        dim_customer_df = dim_customer_df[["CustomerID", "Country", "region"]]
    else:
        dim_customer_df = cust_mode_country.assign(region="Other")
    dim_customer_df.columns = ["customer_id", "country", "region"]

    # Build FactSales
    fact_df = (
        sales.merge(prod_agg[["StockCode", "product_id"]], on="StockCode")
        .rename(columns={
            "InvoiceNo": "invoice_no",
            "CustomerID": "customer_id",
            "Quantity": "quantity",
            "UnitPrice": "unit_price"
        })
        [["invoice_no", "date_id", "product_id", "customer_id", "quantity", "unit_price", "revenue"]]
    )
    fact_df["sale_id"] = np.arange(1, len(fact_df) + 1)

    # Save rejects
    if rejects:
        rej_df = pd.concat(rejects, ignore_index=True)
        rej_file = EXPORTS_DIR / "rejected_records.csv"
        rej_df.to_csv(rej_file, index=False)
        total_rejects = len(rej_df)
    else:
        total_rejects = 0

    # Build Snowflake Schema Dataframes
    # Regions
    regions_unique = sorted(dim_customer_df["region"].unique())
    snow_region_df = pd.DataFrame({"region_id": range(1, len(regions_unique) + 1), "region": regions_unique})

    # Countries
    countries_unique = dim_customer_df[["country", "region"]].drop_duplicates().merge(
        snow_region_df, on="region", how="left"
    )
    snow_country_df = pd.DataFrame({
        "country_id": range(1, len(countries_unique) + 1),
        "country": countries_unique["country"],
        "region_id": countries_unique["region_id"]
    })

    # Customers
    snow_cust_df = dim_customer_df.merge(snow_country_df[["country", "country_id"]], on="country", how="left")
    snow_customer_df = snow_cust_df[["customer_id", "country_id"]]

    # Price bands
    snow_band_df = bands[["band_id", "price_band"]].copy()

    # Products
    snow_prod_df = dim_product_df.merge(snow_band_df, on="price_band", how="left")
    snow_product_df = snow_prod_df[["product_id", "stock_code", "description", "band_id"]]

    # Snowflake Fact
    snow_fact_df = fact_df.copy()

    # Step 3: Load into SQLite
    with engine.begin() as conn:
        # Clear existing records cleanly
        for tbl in [
            "fact_sales", "dim_product", "dim_customer", "dim_date",
            "snow_fact_sales", "snow_dim_product", "snow_dim_customer",
            "snow_dim_country", "snow_dim_region", "snow_dim_price_band"
        ]:
            conn.execute(text(f"DELETE FROM {tbl}"))

        # Load Star Schema
        dim_date_df.to_sql("dim_date", conn, if_exists="append", index=False)
        dim_product_df.to_sql("dim_product", conn, if_exists="append", index=False)
        dim_customer_df.to_sql("dim_customer", conn, if_exists="append", index=False)
        fact_df.to_sql("fact_sales", conn, if_exists="append", index=False, chunksize=25000)

        # Load Snowflake Schema
        snow_region_df.to_sql("snow_dim_region", conn, if_exists="append", index=False)
        snow_country_df.to_sql("snow_dim_country", conn, if_exists="append", index=False)
        snow_customer_df.to_sql("snow_dim_customer", conn, if_exists="append", index=False)
        snow_band_df.to_sql("snow_dim_price_band", conn, if_exists="append", index=False)
        snow_product_df.to_sql("snow_dim_product", conn, if_exists="append", index=False)
        snow_fact_df.to_sql("snow_fact_sales", conn, if_exists="append", index=False, chunksize=25000)

    # Step 4: Verification & Reconciliation
    with engine.connect() as conn:
        fact_count = conn.execute(text("SELECT COUNT(*), ROUND(SUM(revenue), 2) FROM fact_sales")).fetchone()
        cust_count = conn.execute(text("SELECT COUNT(*) FROM dim_customer")).scalar()
        prod_count = conn.execute(text("SELECT COUNT(*) FROM dim_product")).scalar()
        date_count = conn.execute(text("SELECT COUNT(*) FROM dim_date")).scalar()

    total_loaded_fact = int(fact_count[0]) if fact_count else 0
    total_loaded_revenue = float(fact_count[1]) if fact_count else 0.0

    audit_summary = {
        "status": "success",
        "raw_extracted_rows": raw_count,
        "total_rejected_rows": total_rejects,
        "loaded_fact_rows": total_loaded_fact,
        "loaded_customers": cust_count,
        "loaded_products": prod_count,
        "loaded_dates": date_count,
        "total_revenue": total_loaded_revenue,
        "cleaning_funnel": [{"step": s[0], "records_remaining": s[1]} for s in stages],
        "reconciliation_check": (raw_count - total_rejects == total_loaded_fact),
    }

    # Save audit report
    audit_path = REPORTS_DIR / "etl_audit_report.json"
    with open(audit_path, "w") as f:
        json.dump(audit_summary, f, indent=2)

    logger.info("ETL Pipeline completed successfully.")
    return audit_summary
