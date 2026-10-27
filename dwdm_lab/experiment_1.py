import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
CSV_PATH = 'Online_Retail.csv'
df = pd.read_csv(CSV_PATH, encoding='latin-1')
df['InvoiceDate'] = pd.to_datetime(df['InvoiceDate'], format='%m/%d/%Y %H:%M')
print("Instances:", df.shape[0], "| Attributes:", df.shape[1])
# ---- Attribute types ----
print("\nAttributes, data types and attribute kind:")
kind = {'InvoiceNo': 'nominal', 'StockCode': 'nominal', 'Description': 'nominal (text)',
        'Quantity': 'numeric (ratio)', 'InvoiceDate': 'date-time (interval)',
        'UnitPrice': 'numeric (ratio)', 'CustomerID': 'nominal (id)', 'Country': 'nominal'}
for c in df.columns:
    print(f" {c:<12} {str(df[c].dtype):<16} {kind[c]}")
print("\nFirst five records:")
print(df.head().to_string())
# ---- Basic statistics ----
print("\nBasic statistics of numeric attributes:")
print(df[['Quantity', 'UnitPrice']].describe().round(2).to_string())
print("\nMissing values per attribute:")
print(df.isnull().sum().to_string())
print("\nDistinct values:")
print({c: df[c].nunique() for c in ['InvoiceNo', 'StockCode', 'CustomerID', 'Country']})
print("Period covered:", df['InvoiceDate'].min().date(), "to", df['InvoiceDate'].max().date())
print("Cancelled invoices (InvoiceNo starts with 'C'):", df['InvoiceNo'].astype(str).str.startswith('C').sum())
print("Skewness of Quantity: %.1f | UnitPrice: %.1f" % (df['Quantity'].skew(), df['UnitPrice'].skew()))
print("\nTop 5 countries by number of records:")
print(df['Country'].value_counts().head(5).to_string())
# ---- Plots ----
valid = df[(df['Quantity'] > 0) & (df['UnitPrice'] > 0)]
fig, ax = plt.subplots(1, 2, figsize=(12, 4))
ax[0].hist(np.log10(valid['UnitPrice']), bins=40, edgecolor='black')
ax[0].set_title("Histogram of log10(UnitPrice)")
ax[1].hist(np.log10(valid['Quantity']), bins=40, edgecolor='black', color='orange')
ax[1].set_title("Histogram of log10(Quantity)")
plt.tight_layout()
plt.show()
fig, ax = plt.subplots(1, 2, figsize=(10, 4))
for a, col in zip(ax, ['Quantity', 'UnitPrice']):
    a.boxplot(valid[col].clip(upper=valid[col].quantile(0.99)))
    a.set_title("Box plot of " + col + " (clipped at 99th percentile)", fontsize=9)
plt.tight_layout()
plt.show()
plt.figure(figsize=(8, 4))
df['Country'].value_counts().head(8).sort_values().plot(kind='barh', color='teal')
plt.title("Top 8 countries by number of records")
plt.tight_layout()
plt.show()
