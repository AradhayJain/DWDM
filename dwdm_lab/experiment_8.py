import time
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
print("Dataset:", T.shape[0], "baskets,", T.shape[1], "items\n")
def timed(func, support, repeats=3):
    best = 1e9
    for _ in range(repeats):
        t0 = time.perf_counter()
        fi = func(T, min_support=support, use_colnames=True)
        best = min(best, time.perf_counter() - t0)
    return fi, best * 1000
rows = []
for s in [0.03, 0.02, 0.015, 0.01, 0.008]:
    fa, ta = timed(apriori, s)
    ff, tf = timed(fpgrowth, s)
    ra = association_rules(fa, metric='confidence', min_threshold=0.5)
    rf = association_rules(ff, metric='confidence', min_threshold=0.5)
    same = set(fa['itemsets']) == set(ff['itemsets'])
    rows.append([s, len(fa), len(ra), round(ta), len(ff), len(rf), round(tf), same])
res = pd.DataFrame(rows, columns=['min_sup', 'Apr_itemsets', 'Apr_rules', 'Apr_ms',
                                  'FP_itemsets', 'FP_rules', 'FP_ms', 'same_result'])
print(res.to_string(index=False))
print("\nBoth algorithms generate identical itemsets:", bool(res['same_result'].all()))
cross = res[res['FP_ms'] < res['Apr_ms']]
print("FP-growth becomes faster than Apriori from min_support =", cross['min_sup'].max() if len(cross) else "not reached")
fig, ax = plt.subplots(1, 2, figsize=(12, 4.5))
ax[0].plot(res['min_sup'], res['Apr_ms'], 'o-', label='Apriori')
ax[0].plot(res['min_sup'], res['FP_ms'], 's-', label='FP-growth')
ax[0].invert_xaxis(); ax[0].set_xlabel("Minimum support"); ax[0].set_ylabel("Run time (ms)")
ax[0].set_title("Run time comparison"); ax[0].legend()
w = 0.35; x = np.arange(len(res))
ax[1].bar(x - w/2, res['Apr_rules'], w, label='Apriori')
ax[1].bar(x + w/2, res['FP_rules'], w, label='FP-growth')
ax[1].set_xticks(x); ax[1].set_xticklabels(res['min_sup'])
ax[1].set_xlabel("Minimum support"); ax[1].set_ylabel("Rules (conf >= 0.5)")
ax[1].set_title("Number of rules generated"); ax[1].legend()
plt.tight_layout(); plt.show()
