import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from mlxtend.frequent_patterns import apriori, fpgrowth, association_rules
# ---- Basket data ----
df = pd.read_csv('Online_Retail.csv', encoding='latin-1').drop_duplicates()
df = df[(df['Country'] == 'United Kingdom') & ~df['InvoiceNo'].astype(str).str.startswith('C')
        & (df['Quantity'] > 0) & (df['UnitPrice'] > 0)].dropna(subset=['Description'])
df['Description'] = df['Description'].str.strip()
df = df[~df['Description'].isin(['POSTAGE', 'Manual', 'DOTCOM POSTAGE', 'CARRIAGE'])]
TOP = 100
top_items = df.groupby('Description')['InvoiceNo'].nunique().nlargest(TOP).index
T = (df[df['Description'].isin(top_items)].drop_duplicates(['InvoiceNo', 'Description'])
       .assign(v=True).pivot(index='InvoiceNo', columns='Description', values='v').fillna(False).astype(bool))
T = T[T.sum(axis=1) >= 2]
print("Baskets (invoices):", T.shape[0], "| Items:", T.shape[1], "| Average basket size: %.2f" % T.sum(axis=1).mean())
print("\nTen most frequent items (support):")
print(T.mean().sort_values(ascending=False).head(10).round(3).to_string())
# ---- Apriori with chosen thresholds ----
fi = apriori(T, min_support=0.02, use_colnames=True)
fi['size'] = fi['itemsets'].apply(len)
print("\nFrequent itemsets (min_support = 0.02):", len(fi))
print(fi.groupby('size').size().rename('count').to_string())
rules = association_rules(fi, metric='confidence', min_threshold=0.6).sort_values('lift', ascending=False)
fmt = lambda s: " + ".join(sorted(s))
show = rules.assign(antecedents=rules['antecedents'].apply(fmt), consequents=rules['consequents'].apply(fmt))
pd.set_option('display.width', 250); pd.set_option('display.max_colwidth', 36)
print("\nTop association rules (min_support=0.02, min_confidence=0.6): %d rules" % len(rules))
print(show[['antecedents', 'consequents', 'support', 'confidence', 'lift']].head(6).round(3).to_string(index=False))
# ---- Threshold comparison ----
supports = [0.05, 0.03, 0.02, 0.015, 0.01]
confs = [0.3, 0.5, 0.7, 0.9]
grid = pd.DataFrame(0, index=supports, columns=confs)
n_items = {}
for s in supports:
    f = apriori(T, min_support=s, use_colnames=True)
    n_items[s] = len(f)
    for c in confs:
        grid.loc[s, c] = len(association_rules(f, metric='confidence', min_threshold=c)) if len(f) > 1 else 0
grid.index.name = 'min_support'
grid.columns = [f"conf>={c}" for c in confs]
grid.insert(0, 'itemsets', pd.Series(n_items))
print("\nNumber of itemsets / rules for different thresholds:")
print(grid.to_string())
fig, ax = plt.subplots(1, 2, figsize=(12, 4.5))
for c in grid.columns[1:]:
    ax[0].plot(supports, grid[c], marker='o', label=c)
ax[0].invert_xaxis(); ax[0].set_xlabel("Minimum support"); ax[0].set_ylabel("Number of rules")
ax[0].set_title("Rules vs minimum support"); ax[0].legend()
sc = ax[1].scatter(rules['support'], rules['confidence'], c=rules['lift'], cmap='viridis', s=30)
plt.colorbar(sc, ax=ax[1], label='lift')
ax[1].set_xlabel("Support"); ax[1].set_ylabel("Confidence"); ax[1].set_title("Support-confidence scatter of rules")
plt.tight_layout(); plt.show()
