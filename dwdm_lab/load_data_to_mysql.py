import argparse
import os
import re
import pandas as pd
import pymysql
COLUMNS = ['InvoiceNo', 'StockCode', 'Description', 'Quantity', 'InvoiceDate', 'UnitPrice', 'CustomerID', 'Country']
DDL = """
CREATE TABLE `{table}` (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    InvoiceNo   VARCHAR(20)   NOT NULL,
    StockCode   VARCHAR(20)   NOT NULL,
    Description VARCHAR(255)  NULL,
    Quantity    INT           NOT NULL,
    InvoiceDate DATETIME      NOT NULL,
    UnitPrice   DECIMAL(12,3) NOT NULL,
    CustomerID  INT           NULL,
    Country     VARCHAR(50)   NOT NULL,
    INDEX idx_invoice  (InvoiceNo),
    INDEX idx_stock    (StockCode),
    INDEX idx_customer (CustomerID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
"""
def to_python(v):
    if v is None or v is pd.NA or v is pd.NaT:
        return None
    if isinstance(v, float) and v != v:
        return None
    if isinstance(v, pd.Timestamp):
        return v.to_pydatetime()
    return v
def read_csv(path):
    df = pd.read_csv(path, encoding='latin-1', dtype={'InvoiceNo': str, 'StockCode': str})
    df = df[COLUMNS]
    try:
        df['InvoiceDate'] = pd.to_datetime(df['InvoiceDate'], format='%m/%d/%Y %H:%M')
    except ValueError:
        df['InvoiceDate'] = pd.to_datetime(df['InvoiceDate'])
    df['CustomerID'] = df['CustomerID'].astype('Int64')
    return df
def main():
    ap = argparse.ArgumentParser(description="Load Online_Retail.csv into MySQL.", formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--csv', default='Online_Retail.csv')
    ap.add_argument('--host', default=os.getenv('MYSQL_HOST', '127.0.0.1'))
    ap.add_argument('--port', type=int, default=int(os.getenv('MYSQL_PORT', '3306')))
    ap.add_argument('--user', default=os.getenv('MYSQL_USER', 'root'))
    ap.add_argument('--password', default=os.getenv('MYSQL_PASSWORD', 'root'))
    ap.add_argument('--database', default='DTU')
    ap.add_argument('--table', default='online_retail')
    ap.add_argument('--chunk', type=int, default=5000, help='rows per INSERT batch')
    a = ap.parse_args()
    for name in (a.database, a.table):
        if not re.fullmatch(r'\w+', name):
            raise SystemExit("Invalid database/table name: " + name)
    df = read_csv(a.csv)
    print(f"Read {len(df):,} rows from {a.csv}")
    conn = pymysql.connect(host=a.host, port=a.port, user=a.user, password=a.password, charset='utf8mb4')
    try:
        with conn.cursor() as cur:
            cur.execute(f"CREATE DATABASE IF NOT EXISTS `{a.database}` CHARACTER SET utf8mb4")
            cur.execute(f"USE `{a.database}`")
            cur.execute(f"DROP TABLE IF EXISTS `{a.table}`")
            cur.execute(DDL.format(table=a.table))
            sql = (f"INSERT INTO `{a.table}` ({', '.join(COLUMNS)}) "
                   f"VALUES ({', '.join(['%s'] * len(COLUMNS))})")
            cols = [df[c].tolist() for c in COLUMNS]
            rows = [tuple(to_python(v) for v in r) for r in zip(*cols)]
            for i in range(0, len(rows), a.chunk):
                cur.executemany(sql, rows[i:i + a.chunk])
                conn.commit()
                print(f"  inserted {min(i + a.chunk, len(rows)):,} / {len(rows):,}", end='\r')
            print()
            cur.execute(f"SELECT COUNT(*), COUNT(CustomerID), MIN(InvoiceDate), MAX(InvoiceDate) FROM `{a.table}`")
            n, n_cust, d0, d1 = cur.fetchone()
            print(f"Table {a.database}.{a.table}: {n:,} rows ({n - n_cust:,} without CustomerID), {d0} to {d1}")
    finally:
        conn.close()
if __name__ == '__main__':
    main()
