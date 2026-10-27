-- ---- STEP 0: Clean data ----
USE DTU;
DROP TABLE IF EXISTS sales_clean;
CREATE TABLE sales_clean AS
SELECT DISTINCT InvoiceNo AS invoice_no, StockCode AS stock_code, IFNULL(Description, 'UNKNOWN') AS description,
       Quantity AS quantity, InvoiceDate AS invoice_date, UnitPrice AS unit_price,
       IFNULL(CustomerID, 0) AS customer_id, Country AS country
FROM online_retail
WHERE InvoiceNo NOT LIKE 'C%' AND Quantity > 0 AND UnitPrice > 0;
ALTER TABLE sales_clean ADD INDEX idx_stock (stock_code), ADD INDEX idx_customer (customer_id);
-- ---- STAR SCHEMA ----
DROP DATABASE IF EXISTS retail_star;
CREATE DATABASE retail_star;
USE retail_star;
CREATE TABLE dim_date (
    date_id    INT PRIMARY KEY,
    full_date  DATE,
    day        INT,
    month      INT,
    month_name VARCHAR(3),
    quarter    INT,
    year       INT,
    weekday    VARCHAR(10));
CREATE TABLE dim_product (
    product_id  INT AUTO_INCREMENT PRIMARY KEY,
    stock_code  VARCHAR(20),
    description VARCHAR(255),
    price_band  VARCHAR(10));
CREATE TABLE dim_customer (
    customer_id INT PRIMARY KEY,
    country     VARCHAR(50),
    region      VARCHAR(25));
CREATE TABLE fact_sales (
    sale_id     INT AUTO_INCREMENT PRIMARY KEY,
    invoice_no  VARCHAR(20),
    date_id     INT,
    product_id  INT,
    customer_id INT,
    quantity    INT,
    unit_price  DECIMAL(10,2),
    revenue     DECIMAL(12,2),
    FOREIGN KEY (date_id)     REFERENCES dim_date(date_id),
    FOREIGN KEY (product_id)  REFERENCES dim_product(product_id),
    FOREIGN KEY (customer_id) REFERENCES dim_customer(customer_id));
-- ---- Load dimensions ----
INSERT INTO dim_date (date_id, full_date, day, month, month_name, quarter, year, weekday)
SELECT CAST(DATE_FORMAT(d, '%Y%m%d') AS UNSIGNED), d, DAY(d), MONTH(d), DATE_FORMAT(d, '%b'), QUARTER(d), YEAR(d), DAYNAME(d)
FROM (SELECT DISTINCT DATE(invoice_date) AS d FROM DTU.sales_clean) t;
INSERT INTO dim_product (stock_code, description, price_band)
SELECT p.stock_code, d.description,
       CASE WHEN p.avg_price <= 1  THEN 'Budget'
            WHEN p.avg_price <= 3  THEN 'Economy'
            WHEN p.avg_price <= 10 THEN 'Standard'
            ELSE 'Premium' END
FROM (SELECT stock_code, AVG(unit_price) AS avg_price FROM DTU.sales_clean GROUP BY stock_code) p
JOIN (SELECT stock_code, description
      FROM (SELECT stock_code, description,
                   ROW_NUMBER() OVER (PARTITION BY stock_code ORDER BY COUNT(*) DESC, description) AS rn
            FROM DTU.sales_clean GROUP BY stock_code, description) x
      WHERE rn = 1) d ON d.stock_code = p.stock_code
ORDER BY p.stock_code;
INSERT INTO dim_customer (customer_id, country, region)
SELECT customer_id, country,
       CASE WHEN country = 'United Kingdom' THEN 'UK'
            WHEN country IN ('Austria','Belgium','Channel Islands','Cyprus','Czech Republic','Denmark','EIRE','Finland',
                             'France','Germany','Greece','Iceland','Italy','Lithuania','Malta','Netherlands','Norway',
                             'Poland','Portugal','Spain','Sweden','Switzerland','European Community') THEN 'Europe'
            WHEN country IN ('Australia','Hong Kong','Japan','Singapore') THEN 'Asia-Pacific'
            WHEN country IN ('USA','Canada','Brazil') THEN 'Americas'
            WHEN country IN ('Bahrain','Israel','Lebanon','Saudi Arabia','United Arab Emirates','RSA') THEN 'Middle East & Africa'
            ELSE 'Other' END
FROM (SELECT customer_id, country,
             ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY COUNT(*) DESC, country) AS rn
      FROM DTU.sales_clean GROUP BY customer_id, country) t
WHERE rn = 1;
-- ---- Load fact table ----
INSERT INTO fact_sales (invoice_no, date_id, product_id, customer_id, quantity, unit_price, revenue)
SELECT s.invoice_no, CAST(DATE_FORMAT(s.invoice_date, '%Y%m%d') AS UNSIGNED), p.product_id, s.customer_id,
       s.quantity, s.unit_price, ROUND(s.quantity * s.unit_price, 2)
FROM DTU.sales_clean s JOIN dim_product p ON p.stock_code = s.stock_code;
SELECT 'STAR SCHEMA (retail_star) - rows loaded' AS info;
SELECT 'dim_date' AS tbl, COUNT(*) AS n FROM dim_date
UNION ALL SELECT 'dim_product',  COUNT(*) FROM dim_product
UNION ALL SELECT 'dim_customer', COUNT(*) FROM dim_customer
UNION ALL SELECT 'fact_sales',   COUNT(*) FROM fact_sales;
SELECT 'Structure of fact_sales' AS info;
DESCRIBE fact_sales;
SELECT 'Sales by region (star schema: 1 join to dim_customer)' AS info;
SELECT c.region, COUNT(DISTINCT f.invoice_no) AS invoices, ROUND(SUM(f.revenue)) AS revenue
FROM fact_sales f JOIN dim_customer c ON f.customer_id = c.customer_id
GROUP BY c.region ORDER BY revenue DESC;
-- ---- SNOWFLAKE SCHEMA ----
DROP DATABASE IF EXISTS retail_snow;
CREATE DATABASE retail_snow;
USE retail_snow;
CREATE TABLE dim_region (
    region_id INT AUTO_INCREMENT PRIMARY KEY,
    region    VARCHAR(25));
CREATE TABLE dim_country (
    country_id INT AUTO_INCREMENT PRIMARY KEY,
    country    VARCHAR(50),
    region_id  INT,
    FOREIGN KEY (region_id) REFERENCES dim_region(region_id));
CREATE TABLE dim_customer (
    customer_id INT PRIMARY KEY,
    country_id  INT,
    FOREIGN KEY (country_id) REFERENCES dim_country(country_id));
CREATE TABLE dim_price_band (
    band_id    INT AUTO_INCREMENT PRIMARY KEY,
    price_band VARCHAR(10));
CREATE TABLE dim_product (
    product_id  INT PRIMARY KEY,
    stock_code  VARCHAR(20),
    description VARCHAR(255),
    band_id     INT,
    FOREIGN KEY (band_id) REFERENCES dim_price_band(band_id));
CREATE TABLE dim_date (
    date_id    INT PRIMARY KEY,
    full_date  DATE,
    day        INT,
    month      INT,
    month_name VARCHAR(3),
    quarter    INT,
    year       INT,
    weekday    VARCHAR(10));
CREATE TABLE fact_sales (
    sale_id     INT PRIMARY KEY,
    invoice_no  VARCHAR(20),
    date_id     INT,
    product_id  INT,
    customer_id INT,
    quantity    INT,
    unit_price  DECIMAL(10,2),
    revenue     DECIMAL(12,2),
    FOREIGN KEY (date_id)     REFERENCES dim_date(date_id),
    FOREIGN KEY (product_id)  REFERENCES dim_product(product_id),
    FOREIGN KEY (customer_id) REFERENCES dim_customer(customer_id));
-- ---- Load dimensions and fact ----
INSERT INTO dim_region (region)
SELECT DISTINCT region FROM retail_star.dim_customer ORDER BY region;
INSERT INTO dim_country (country, region_id)
SELECT DISTINCT c.country, r.region_id
FROM retail_star.dim_customer c JOIN dim_region r ON r.region = c.region
ORDER BY c.country;
INSERT INTO dim_customer (customer_id, country_id)
SELECT c.customer_id, co.country_id
FROM retail_star.dim_customer c JOIN dim_country co ON co.country = c.country;
INSERT INTO dim_price_band (price_band) VALUES ('Budget'), ('Economy'), ('Standard'), ('Premium');
INSERT INTO dim_product (product_id, stock_code, description, band_id)
SELECT p.product_id, p.stock_code, p.description, b.band_id
FROM retail_star.dim_product p JOIN dim_price_band b ON b.price_band = p.price_band;
INSERT INTO dim_date (date_id, full_date, day, month, month_name, quarter, year, weekday)
SELECT date_id, full_date, day, month, month_name, quarter, year, weekday FROM retail_star.dim_date;
INSERT INTO fact_sales (sale_id, invoice_no, date_id, product_id, customer_id, quantity, unit_price, revenue)
SELECT sale_id, invoice_no, date_id, product_id, customer_id, quantity, unit_price, revenue FROM retail_star.fact_sales;
SELECT 'SNOWFLAKE SCHEMA (retail_snow) - rows loaded' AS info;
SELECT 'dim_region' AS tbl, COUNT(*) AS n FROM dim_region
UNION ALL SELECT 'dim_country',    COUNT(*) FROM dim_country
UNION ALL SELECT 'dim_customer',   COUNT(*) FROM dim_customer
UNION ALL SELECT 'dim_price_band', COUNT(*) FROM dim_price_band
UNION ALL SELECT 'dim_product',    COUNT(*) FROM dim_product
UNION ALL SELECT 'dim_date',       COUNT(*) FROM dim_date
UNION ALL SELECT 'fact_sales',     COUNT(*) FROM fact_sales;
SELECT 'Sales by region (snowflake schema: 3 joins to reach region)' AS info;
SELECT r.region, COUNT(DISTINCT f.invoice_no) AS invoices, ROUND(SUM(f.revenue)) AS revenue
FROM fact_sales f JOIN dim_customer c  ON f.customer_id = c.customer_id
                  JOIN dim_country co ON c.country_id = co.country_id
                  JOIN dim_region r   ON co.region_id = r.region_id
GROUP BY r.region ORDER BY revenue DESC;
