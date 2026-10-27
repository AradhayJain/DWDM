import json
import numpy as np
import pandas as pd
from sqlalchemy import create_engine, text
SERVER = "mysql+pymysql://root:root@127.0.0.1:3306"
# ---- STEP 0: Sources ----
regions = {'UK': ['United Kingdom'],
           'Europe': ['Austria', 'Belgium', 'Channel Islands', 'Cyprus', 'Czech Republic', 'Denmark', 'European Community',
                      'Finland', 'France', 'Germany', 'Greece', 'Iceland', 'Ireland', 'Italy', 'Lithuania', 'Malta',
                      'Netherlands', 'Norway', 'Poland', 'Portugal', 'Spain', 'Sweden', 'Switzerland'],
           'Asia-Pacific': ['Australia', 'Hong Kong', 'Japan', 'Singapore'],
           'Americas': ['Brazil', 'Canada', 'United States'],
           'Middle East & Africa': ['Bahrain', 'Israel', 'Lebanon', 'Saudi Arabia', 'South Africa', 'United Arab Emirates']}
json.dump([{'country': c, 'region': r} for r, cs in regions.items() for c in cs], open('country_region.json', 'w'), indent=1)
root = create_engine(SERVER)
with root.begin() as c:
    for d in ['src_db', 'retail_etl']:
        c.execute(text(f"DROP DATABASE IF EXISTS {d}")); c.execute(text(f"CREATE DATABASE {d}"))
pd.DataFrame({'band_id': [1, 2, 3, 4], 'price_band': ['Budget', 'Economy', 'Standard', 'Premium'],
              'min_price': [0, 1, 3, 10], 'max_price': [1, 3, 10, 100000]}).to_sql('price_band', create_engine(SERVER + "/src_db"), index=False)
# ---- STEP 1: Extract ----
sales = pd.read_csv('Online_Retail.csv', encoding='latin-1')
country_region = pd.read_json('country_region.json')
bands = pd.read_sql("SELECT * FROM price_band", create_engine(SERVER + "/src_db"))
print("[EXTRACT] Online_Retail.csv   :", len(sales), "rows (CSV)")
print("[EXTRACT] country_region.json :", len(country_region), "rows (JSON)")
print("[EXTRACT] src_db.price_band   :", len(bands), "rows (MySQL)")
# ---- STEP 2: Transform ----
stages, rejects = [('Extracted', len(sales))], []
def reject(mask, reason):
    global sales
    rejects.append(sales[mask].assign(reason=reason)); sales = sales[~mask]
    print(f"[CLEAN] {reason:<34}: {int(mask.sum()):>7}"); stages.append((reason.split(' (')[0], len(sales)))
reject(sales.duplicated(), 'duplicate records')
reject(sales['InvoiceNo'].astype(str).str.startswith('C'), 'cancelled invoices (returns)')
reject((sales['Quantity'] <= 0) | (sales['UnitPrice'] <= 0), 'non-positive quantity or price')
sales['StockCode'] = sales['StockCode'].astype(str).str.strip().str.upper()
non_product = {'POST', 'D', 'M', 'BANK CHARGES', 'DOT', 'CRUCIAL', 'C2', 'AMAZONFEE', 'S', 'B', 'PADS'}
reject(sales['StockCode'].isin(non_product), 'non-merchandise codes (postage etc.)')
sales['InvoiceDate'] = pd.to_datetime(sales['InvoiceDate'], format='%m/%d/%Y %H:%M')
sales['Description'] = sales['Description'].str.strip().str.upper()
mode_desc = sales.dropna(subset=['Description']).groupby('StockCode')['Description'].agg(lambda s: s.mode()[0])
sales['Description'] = sales['Description'].fillna(sales['StockCode'].map(mode_desc)).fillna('UNKNOWN')
sales['CustomerID'] = sales['CustomerID'].fillna(0).astype(int)
sales['Country'] = sales['Country'].str.strip().replace({'EIRE': 'Ireland', 'RSA': 'South Africa', 'USA': 'United States', 'Unspecified': 'Unknown'})
print("[STANDARDISE] country names unified; descriptions upper-cased; missing CustomerID -> 0 (guest)")
sales['revenue'] = (sales['Quantity'] * sales['UnitPrice']).round(2)
sales['date_id'] = sales['InvoiceDate'].dt.strftime('%Y%m%d').astype(int)
dim_date = pd.DataFrame({'full_date': sorted(sales['InvoiceDate'].dt.normalize().unique())})
dim_date['date_id'] = dim_date['full_date'].dt.strftime('%Y%m%d').astype(int)
dim_date['day'], dim_date['month'] = dim_date['full_date'].dt.day, dim_date['full_date'].dt.month
dim_date['quarter'], dim_date['year'] = dim_date['full_date'].dt.quarter, dim_date['full_date'].dt.year
dim_date['weekday'] = dim_date['full_date'].dt.day_name(); dim_date['full_date'] = dim_date['full_date'].dt.date
prod = sales.groupby('StockCode').agg(description=('Description', lambda s: s.mode()[0]), avg_price=('UnitPrice', 'mean')).reset_index()
prod['product_id'] = np.arange(1, len(prod) + 1)
edges = [0] + list(bands['max_price'])
prod['price_band'] = pd.cut(prod['avg_price'], edges, labels=bands['price_band']).astype(str)
dim_product = prod[['product_id', 'StockCode', 'description', 'price_band']].rename(columns={'StockCode': 'stock_code'})
dim_customer = (sales.groupby('CustomerID')['Country'].agg(lambda s: s.mode()[0]).reset_index()
                .merge(country_region, left_on='Country', right_on='country', how='left')[['CustomerID', 'Country', 'region']])
dim_customer['region'] = dim_customer['region'].fillna('Other')
dim_customer.columns = ['customer_id', 'country', 'region']
fact = (sales.merge(prod[['StockCode', 'product_id']], on='StockCode')
             .rename(columns={'InvoiceNo': 'invoice_no', 'CustomerID': 'customer_id', 'Quantity': 'quantity', 'UnitPrice': 'unit_price'})
             [['invoice_no', 'date_id', 'product_id', 'customer_id', 'quantity', 'unit_price', 'revenue']])
print("[TRANSFORM] derived revenue, date_id, price_band, region; fact rows ready:", len(fact))
pd.concat(rejects).to_csv('rejected_records.csv', index=False)
print("[REJECTS] %d records written to rejected_records.csv" % sum(len(r) for r in rejects))
# ---- STEP 3: Load ----
dw = create_engine(SERVER + "/retail_etl")
with dw.begin() as c:
    c.execute(text("CREATE TABLE dim_date (date_id INT PRIMARY KEY, full_date DATE, day INT, month INT, quarter INT, year INT, weekday VARCHAR(10))"))
    c.execute(text("CREATE TABLE dim_product (product_id INT PRIMARY KEY, stock_code VARCHAR(12), description VARCHAR(100), price_band VARCHAR(10))"))
    c.execute(text("CREATE TABLE dim_customer (customer_id INT PRIMARY KEY, country VARCHAR(30), region VARCHAR(25))"))
    c.execute(text("""CREATE TABLE fact_sales (sale_id INT AUTO_INCREMENT PRIMARY KEY, invoice_no VARCHAR(10), date_id INT, product_id INT,
                      customer_id INT, quantity INT, unit_price DECIMAL(10,2), revenue DECIMAL(12,2),
                      FOREIGN KEY (date_id) REFERENCES dim_date(date_id), FOREIGN KEY (product_id) REFERENCES dim_product(product_id),
                      FOREIGN KEY (customer_id) REFERENCES dim_customer(customer_id))"""))
for t, d in [('dim_date', dim_date), ('dim_product', dim_product), ('dim_customer', dim_customer), ('fact_sales', fact)]:
    d.to_sql(t, dw, if_exists='append', index=False, chunksize=20000, method='multi')
print("\n[LOAD] warehouse retail_etl populated")
# ---- STEP 4: Verify ----
for t in ['dim_date', 'dim_product', 'dim_customer', 'fact_sales']:
    print(f"  {t:<14} rows =", pd.read_sql(f"SELECT COUNT(*) c FROM {t}", dw)['c'][0])
print("\nRevenue by region and price band (from the warehouse):")
q = """SELECT c.region, p.price_band, COUNT(DISTINCT f.invoice_no) AS invoices, ROUND(SUM(f.revenue)) AS revenue
       FROM fact_sales f JOIN dim_customer c ON f.customer_id = c.customer_id
                         JOIN dim_product p ON f.product_id = p.product_id
       GROUP BY c.region, p.price_band ORDER BY revenue DESC LIMIT 8"""
print(pd.read_sql(q, dw).to_string(index=False))
print("\nData-quality funnel (records remaining after each cleaning step):")
print(pd.DataFrame(stages, columns=["step", "records"]).to_string(index=False))
