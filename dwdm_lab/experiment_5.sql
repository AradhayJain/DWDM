USE retail_star;
-- ---- 1. Roll-up ----
SELECT 'ROLL-UP : revenue by year and quarter with sub-totals' AS operation;
SELECT IF(GROUPING(d.year), 'ALL', d.year)       AS year,
       IF(GROUPING(d.quarter), 'ALL', d.quarter) AS quarter,
       ROUND(SUM(f.revenue)) AS revenue
FROM fact_sales f JOIN dim_date d ON f.date_id = d.date_id
GROUP BY d.year, d.quarter WITH ROLLUP;
-- ---- 2. Drill-down ----
SELECT 'DRILL-DOWN : year level' AS operation;
SELECT d.year, ROUND(SUM(f.revenue)) AS revenue
FROM fact_sales f JOIN dim_date d ON f.date_id = d.date_id
WHERE d.year = 2011 GROUP BY d.year;
SELECT 'DRILL-DOWN : quarter level (2011)' AS operation;
SELECT d.year, d.quarter, ROUND(SUM(f.revenue)) AS revenue
FROM fact_sales f JOIN dim_date d ON f.date_id = d.date_id
WHERE d.year = 2011 GROUP BY d.year, d.quarter;
SELECT 'DRILL-DOWN : month level (2011, Q4)' AS operation;
SELECT d.year, d.quarter, d.month_name, ROUND(SUM(f.revenue)) AS revenue
FROM fact_sales f JOIN dim_date d ON f.date_id = d.date_id
WHERE d.year = 2011 AND d.quarter = 4
GROUP BY d.year, d.quarter, d.month, d.month_name ORDER BY d.month;
-- ---- 3. Slice ----
SELECT 'SLICE : country = Germany, top 5 products by revenue' AS operation;
SELECT p.description, SUM(f.quantity) AS units, ROUND(SUM(f.revenue)) AS revenue
FROM fact_sales f JOIN dim_customer c ON f.customer_id = c.customer_id
                  JOIN dim_product p  ON f.product_id = p.product_id
WHERE c.country = 'Germany'
GROUP BY p.description ORDER BY revenue DESC LIMIT 5;
-- ---- 4. Dice ----
SELECT 'DICE : quarter in (3,4) of 2011, country in (Germany, France, EIRE), price band in (Standard, Premium)' AS operation;
SELECT d.quarter, c.country, p.price_band, ROUND(SUM(f.revenue)) AS revenue
FROM fact_sales f JOIN dim_date d     ON f.date_id = d.date_id
                  JOIN dim_customer c ON f.customer_id = c.customer_id
                  JOIN dim_product p  ON f.product_id = p.product_id
WHERE d.year = 2011 AND d.quarter IN (3, 4) AND c.country IN ('Germany', 'France', 'EIRE')
  AND p.price_band IN ('Standard', 'Premium')
GROUP BY d.quarter, c.country, p.price_band ORDER BY c.country, d.quarter, p.price_band;
-- ---- 5. Pivot ----
SELECT 'PIVOT : country (rows) x quarter (columns), 2011, top 6 countries' AS operation;
SELECT c.country,
       ROUND(SUM(CASE WHEN d.quarter = 1 THEN f.revenue ELSE 0 END)) AS Q1,
       ROUND(SUM(CASE WHEN d.quarter = 2 THEN f.revenue ELSE 0 END)) AS Q2,
       ROUND(SUM(CASE WHEN d.quarter = 3 THEN f.revenue ELSE 0 END)) AS Q3,
       ROUND(SUM(CASE WHEN d.quarter = 4 THEN f.revenue ELSE 0 END)) AS Q4,
       ROUND(SUM(f.revenue)) AS Total
FROM fact_sales f JOIN dim_date d ON f.date_id = d.date_id JOIN dim_customer c ON f.customer_id = c.customer_id
WHERE d.year = 2011
GROUP BY c.country ORDER BY SUM(f.revenue) DESC LIMIT 6;
-- ---- 6. Cube ----
SELECT 'CUBE : (market, quarter) - all grouping combinations, 2011' AS operation;
SELECT t.market, t.quarter, ROUND(SUM(t.revenue)) AS revenue FROM (
  SELECT IF(c.country = 'United Kingdom', 'UK', 'Non-UK') AS market, d.quarter, f.revenue
  FROM fact_sales f JOIN dim_date d ON f.date_id = d.date_id JOIN dim_customer c ON f.customer_id = c.customer_id
  WHERE d.year = 2011) t GROUP BY t.market, t.quarter
UNION ALL
SELECT t.market, 'ALL', ROUND(SUM(t.revenue)) FROM (
  SELECT IF(c.country = 'United Kingdom', 'UK', 'Non-UK') AS market, f.revenue
  FROM fact_sales f JOIN dim_date d ON f.date_id = d.date_id JOIN dim_customer c ON f.customer_id = c.customer_id
  WHERE d.year = 2011) t GROUP BY t.market
UNION ALL
SELECT 'ALL', d.quarter, ROUND(SUM(f.revenue))
FROM fact_sales f JOIN dim_date d ON f.date_id = d.date_id WHERE d.year = 2011 GROUP BY d.quarter
UNION ALL
SELECT 'ALL', 'ALL', ROUND(SUM(f.revenue))
FROM fact_sales f JOIN dim_date d ON f.date_id = d.date_id WHERE d.year = 2011
ORDER BY market, quarter;
