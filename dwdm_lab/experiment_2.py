import numpy as np
import pandas as pd
CSV_PATH = 'Online_Retail.csv'
df = pd.read_csv(CSV_PATH, encoding='latin-1')
df['InvoiceDate'] = pd.to_datetime(df['InvoiceDate'], format='%m/%d/%Y %H:%M')
print("Original records:", len(df))
print("\nMissing values before cleaning:")
print(df.isnull().sum()[lambda s: s > 0].to_string())
# ---- 1. Handling missing values ----
mode_desc = df.dropna(subset=['Description']).groupby('StockCode')['Description'].agg(lambda s: s.mode()[0])
df['Description'] = df['Description'].fillna(df['StockCode'].map(mode_desc)).fillna('UNKNOWN')
guests = df['CustomerID'].isnull().sum()
df['CustomerID'] = df['CustomerID'].fillna(0).astype(int)
print("\nMissing values after cleaning:", int(df.isnull().sum().sum()), "| guest-checkout records:", guests)
# ---- 2. Removing duplicate and invalid records ----
n0 = len(df)
df = df.drop_duplicates()
print("\nDuplicate records removed       :", n0 - len(df))
cancel = df['InvoiceNo'].astype(str).str.startswith('C')
print("Cancelled invoices removed      :", cancel.sum())
df = df[~cancel]
bad = (df['Quantity'] <= 0) | (df['UnitPrice'] <= 0)
print("Non-positive quantity or price  :", bad.sum())
df = df[~bad].copy()
print("Records after cleaning          :", len(df))
# ---- 3. Binning ----
x = df['UnitPrice'].sample(20, random_state=4).sort_values().reset_index(drop=True)
b = pd.qcut(x.rank(method='first'), 5, labels=False)
by_mean = x.groupby(b).transform('mean').round(2)
by_median = x.groupby(b).transform('median')
by_bound = x.groupby(b).transform(lambda s: s.apply(lambda v: s.min() if abs(v - s.min()) <= abs(v - s.max()) else s.max()))
print("\nSmoothing of 20 sorted UnitPrice values by binning:")
print(pd.DataFrame({'UnitPrice': x, 'bin': b, 'bin_mean': by_mean, 'bin_median': by_median,
                    'bin_boundary': by_bound}).to_string())
# ---- 4. Normalisation of Quantity ----
v = df['Quantity']
minmax = (v - v.min()) / (v.max() - v.min())
zscore = (v - v.mean()) / v.std()
j = len(str(int(v.abs().max())))
decimal = v / 10 ** j
norm = pd.DataFrame({'Quantity': v, 'min_max': minmax, 'z_score': zscore, 'decimal': decimal})
print("\nNormalisation of Quantity (first 6 records), decimal scaling uses j =", j)
print(norm.head(6).round(4).to_string())
print("\nSummary after normalisation:")
print(norm.describe().loc[['mean', 'std', 'min', 'max']].round(4).to_string())
