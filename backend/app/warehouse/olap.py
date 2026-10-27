import time
from typing import Dict, Any, List, Optional
from sqlalchemy import text
from backend.app.core.database import engine

def execute_olap_query(
    operation: str,
    schema_type: str = "star",
    year: Optional[int] = 2011,
    quarter: Optional[int] = None,
    month: Optional[int] = None,
    country: Optional[str] = None,
    countries: Optional[List[str]] = None,
    price_bands: Optional[List[str]] = None,
    row_dimension: Optional[str] = "country",
    col_dimension: Optional[str] = "quarter",
    metric: str = "revenue"
) -> Dict[str, Any]:
    t0 = time.perf_counter()
    chart_type = "bar"
    sql = ""
    logic = ""

    is_star = (schema_type == "star")
    fact_table = "fact_sales" if is_star else "snow_fact_sales"
    prod_table = "dim_product" if is_star else "snow_dim_product"
    cust_table = "dim_customer" if is_star else "snow_dim_customer"

    # Base joins
    if is_star:
        base_from = f"""
            FROM {fact_table} f
            JOIN dim_date d ON f.date_id = d.date_id
            JOIN {cust_table} c ON f.customer_id = c.customer_id
            JOIN {prod_table} p ON f.product_id = p.product_id
        """
        country_col = "c.country"
        price_band_col = "p.price_band"
    else:
        base_from = f"""
            FROM {fact_table} f
            JOIN dim_date d ON f.date_id = d.date_id
            JOIN {cust_table} c ON f.customer_id = c.customer_id
            JOIN snow_dim_country co ON c.country_id = co.country_id
            JOIN snow_dim_region r ON co.region_id = r.region_id
            JOIN {prod_table} p ON f.product_id = p.product_id
            JOIN snow_dim_price_band pb ON p.band_id = pb.band_id
        """
        country_col = "co.country"
        price_band_col = "pb.price_band"

    # Operation Logic
    if operation == "rollup":
        logic = "ROLL-UP: Aggregates revenue hierarchically from Quarter level up to Year level and Grand Total."
        chart_type = "bar"
        sql = f"""
            SELECT d.year, 'Q' || d.quarter AS quarter,
                   COUNT(DISTINCT f.invoice_no) AS invoices,
                   SUM(f.quantity) AS total_units,
                   ROUND(SUM(f.revenue), 2) AS revenue
            {base_from}
            WHERE d.year IS NOT NULL
            GROUP BY d.year, d.quarter
            UNION ALL
            SELECT d.year, 'ALL' AS quarter,
                   COUNT(DISTINCT f.invoice_no) AS invoices,
                   SUM(f.quantity) AS total_units,
                   ROUND(SUM(f.revenue), 2) AS revenue
            {base_from}
            WHERE d.year IS NOT NULL
            GROUP BY d.year
            ORDER BY year, quarter
        """

    elif operation == "drilldown":
        chart_type = "line"
        if month:
            logic = f"DRILL-DOWN (Day Level): Inspecting individual days for year {year}, quarter {quarter}, month {month}."
            sql = f"""
                SELECT d.full_date AS date, d.weekday,
                       COUNT(DISTINCT f.invoice_no) AS invoices,
                       SUM(f.quantity) AS total_units,
                       ROUND(SUM(f.revenue), 2) AS revenue
                {base_from}
                WHERE d.year = {year} AND d.quarter = {quarter or 4} AND d.month = {month}
                GROUP BY d.full_date, d.weekday
                ORDER BY d.full_date
            """
        elif quarter:
            logic = f"DRILL-DOWN (Month Level): Inspecting monthly sales within Year {year}, Quarter {quarter}."
            sql = f"""
                SELECT d.month, d.month_name,
                       COUNT(DISTINCT f.invoice_no) AS invoices,
                       SUM(f.quantity) AS total_units,
                       ROUND(SUM(f.revenue), 2) AS revenue
                {base_from}
                WHERE d.year = {year} AND d.quarter = {quarter}
                GROUP BY d.month, d.month_name
                ORDER BY d.month
            """
        else:
            logic = f"DRILL-DOWN (Quarter Level): Inspecting quarterly performance for Year {year}."
            sql = f"""
                SELECT d.quarter, 'Q' || d.quarter AS quarter_name,
                       COUNT(DISTINCT f.invoice_no) AS invoices,
                       SUM(f.quantity) AS total_units,
                       ROUND(SUM(f.revenue), 2) AS revenue
                {base_from}
                WHERE d.year = {year}
                GROUP BY d.quarter
                ORDER BY d.quarter
            """

    elif operation == "slice":
        slice_country = country or "Germany"
        logic = f"SLICE: Fixing dimension {country_col} = '{slice_country}', displaying top products by revenue."
        chart_type = "horizontal_bar"
        sql = f"""
            SELECT p.description AS product,
                   SUM(f.quantity) AS units_sold,
                   COUNT(DISTINCT f.invoice_no) AS orders,
                   ROUND(SUM(f.revenue), 2) AS revenue
            {base_from}
            WHERE {country_col} = '{slice_country}'
            GROUP BY p.description
            ORDER BY revenue DESC
            LIMIT 10
        """

    elif operation == "dice":
        target_countries = countries or ["Germany", "France", "Ireland"]
        c_list = ", ".join(f"'{c}'" for c in target_countries)
        target_bands = price_bands or ["Standard", "Premium"]
        b_list = ", ".join(f"'{b}'" for b in target_bands)
        target_year = year or 2011

        logic = f"DICE: Sub-cube filtered on Year={target_year}, Quarter in (3,4), Country in ({c_list}), and PriceBand in ({b_list})."
        chart_type = "bar"
        sql = f"""
            SELECT 'Q' || d.quarter AS quarter, {country_col} AS country, {price_band_col} AS price_band,
                   COUNT(DISTINCT f.invoice_no) AS invoices,
                   SUM(f.quantity) AS total_quantity,
                   ROUND(SUM(f.revenue), 2) AS revenue
            {base_from}
            WHERE d.year = {target_year}
              AND d.quarter IN (3, 4)
              AND {country_col} IN ({c_list})
              AND {price_band_col} IN ({b_list})
            GROUP BY d.quarter, {country_col}, {price_band_col}
            ORDER BY country, quarter, price_band
        """

    elif operation == "pivot":
        target_year = year or 2011
        logic = f"PIVOT: Cross-tabulating Country (rows) by Quarter (columns) for Year {target_year}."
        chart_type = "table"
        sql = f"""
            SELECT {country_col} AS country,
                   ROUND(SUM(CASE WHEN d.quarter = 1 THEN f.revenue ELSE 0 END), 2) AS Q1,
                   ROUND(SUM(CASE WHEN d.quarter = 2 THEN f.revenue ELSE 0 END), 2) AS Q2,
                   ROUND(SUM(CASE WHEN d.quarter = 3 THEN f.revenue ELSE 0 END), 2) AS Q3,
                   ROUND(SUM(CASE WHEN d.quarter = 4 THEN f.revenue ELSE 0 END), 2) AS Q4,
                   ROUND(SUM(f.revenue), 2) AS total_revenue
            {base_from}
            WHERE d.year = {target_year}
            GROUP BY {country_col}
            ORDER BY total_revenue DESC
            LIMIT 10
        """

    elif operation == "cube":
        target_year = year or 2011
        logic = f"CUBE: Multi-dimensional combinations of (Market, Quarter) for Year {target_year}."
        chart_type = "bar"
        sql = f"""
            SELECT CASE WHEN {country_col} = 'United Kingdom' THEN 'UK' ELSE 'Non-UK' END AS market,
                   'Q' || d.quarter AS quarter,
                   ROUND(SUM(f.revenue), 2) AS revenue
            {base_from}
            WHERE d.year = {target_year}
            GROUP BY market, d.quarter
            UNION ALL
            SELECT CASE WHEN {country_col} = 'United Kingdom' THEN 'UK' ELSE 'Non-UK' END AS market,
                   'ALL' AS quarter,
                   ROUND(SUM(f.revenue), 2) AS revenue
            {base_from}
            WHERE d.year = {target_year}
            GROUP BY market
            UNION ALL
            SELECT 'ALL' AS market, 'Q' || d.quarter AS quarter,
                   ROUND(SUM(f.revenue), 2) AS revenue
            {base_from}
            WHERE d.year = {target_year}
            GROUP BY d.quarter
            UNION ALL
            SELECT 'ALL' AS market, 'ALL' AS quarter,
                   ROUND(SUM(f.revenue), 2) AS revenue
            {base_from}
            WHERE d.year = {target_year}
            ORDER BY market, quarter
        """

    else:
        raise ValueError(f"Unknown OLAP operation: {operation}")

    # Execute SQL
    with engine.connect() as conn:
        res = conn.execute(text(sql))
        columns = list(res.keys())
        rows = res.fetchall()
        data = [dict(zip(columns, r)) for r in rows]

    exec_ms = round((time.perf_counter() - t0) * 1000, 2)

    return {
        "operation": operation,
        "query_logic": logic,
        "sql_executed": sql.strip(),
        "columns": columns,
        "data": data,
        "total_records": len(data),
        "execution_time_ms": exec_ms,
        "chart_type": chart_type
    }
