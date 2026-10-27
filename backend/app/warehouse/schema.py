from typing import Dict, Any, List
from sqlalchemy import text
from backend.app.core.database import engine

def get_warehouse_schema(schema_type: str = "star") -> Dict[str, Any]:
    with engine.connect() as conn:
        if schema_type == "star":
            table_names = ["fact_sales", "dim_date", "dim_product", "dim_customer"]
            relationships = [
                {"from_table": "fact_sales", "from_column": "date_id", "to_table": "dim_date", "to_column": "date_id"},
                {"from_table": "fact_sales", "from_column": "product_id", "to_table": "dim_product", "to_column": "product_id"},
                {"from_table": "fact_sales", "from_column": "customer_id", "to_table": "dim_customer", "to_column": "customer_id"},
            ]
        else: # snowflake
            table_names = [
                "snow_fact_sales", "dim_date", "snow_dim_product",
                "snow_dim_price_band", "snow_dim_customer", "snow_dim_country", "snow_dim_region"
            ]
            relationships = [
                {"from_table": "snow_fact_sales", "from_column": "date_id", "to_table": "dim_date", "to_column": "date_id"},
                {"from_table": "snow_fact_sales", "from_column": "product_id", "to_table": "snow_dim_product", "to_column": "product_id"},
                {"from_table": "snow_fact_sales", "from_column": "customer_id", "to_table": "snow_dim_customer", "to_column": "customer_id"},
                {"from_table": "snow_dim_product", "from_column": "band_id", "to_table": "snow_dim_price_band", "to_column": "band_id"},
                {"from_table": "snow_dim_customer", "from_column": "country_id", "to_table": "snow_dim_country", "to_column": "country_id"},
                {"from_table": "snow_dim_country", "from_column": "region_id", "to_table": "snow_dim_region", "to_column": "region_id"},
            ]

        tables = []
        for tbl in table_names:
            try:
                # Get columns
                col_info = conn.execute(text(f"PRAGMA table_info({tbl})")).fetchall()
                columns = [{"name": c[1], "type": c[2], "is_pk": bool(c[5])} for c in col_info]
                pks = [c[1] for c in col_info if c[5]]

                # Get row count
                row_count = conn.execute(text(f"SELECT COUNT(*) FROM {tbl}")).scalar() or 0

                # Get foreign keys
                fk_info = conn.execute(text(f"PRAGMA foreign_key_list({tbl})")).fetchall()
                fks = [{"from": f[3], "to_table": f[2], "to_column": f[4]} for f in fk_info]

                # Get sample data
                samples = []
                if row_count > 0:
                    rows = conn.execute(text(f"SELECT * FROM {tbl} LIMIT 5")).mappings().fetchall()
                    samples = [dict(r) for r in rows]

                table_type = "fact" if "fact" in tbl else "dimension"
                tables.append({
                    "name": tbl,
                    "type": table_type,
                    "columns": columns,
                    "row_count": row_count,
                    "primary_keys": pks,
                    "foreign_keys": fks,
                    "sample_data": samples
                })
            except Exception as e:
                tables.append({
                    "name": tbl,
                    "type": "error",
                    "columns": [],
                    "row_count": 0,
                    "primary_keys": [],
                    "foreign_keys": [],
                    "sample_data": [],
                    "error": str(e)
                })

        # Total revenue & fact count
        fact_tbl = "fact_sales" if schema_type == "star" else "snow_fact_sales"
        try:
            rev_row = conn.execute(text(f"SELECT COUNT(*), ROUND(SUM(revenue), 2) FROM {fact_tbl}")).fetchone()
            total_fact = int(rev_row[0]) if rev_row and rev_row[0] else 0
            total_rev = float(rev_row[1]) if rev_row and rev_row[1] else 0.0
        except Exception:
            total_fact = 0
            total_rev = 0.0

    return {
        "schema_type": schema_type,
        "tables": tables,
        "relationships": relationships,
        "total_sales_revenue": total_rev,
        "total_fact_rows": total_fact
    }
