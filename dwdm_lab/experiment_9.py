import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy.stats import chi2_contingency
from mlxtend.frequent_patterns import apriori, association_rules
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
N = len(T)
def measures(n, nA, nB, nAB):
    sA, sB, sAB = nA / n, nB / n, nAB / n
    table = [[nAB, nA - nAB], [nB - nAB, n - nA - nB + nAB]]
    chi2 = chi2_contingency(table, correction=False)[0]
    return {'support': sAB, 'confidence': sAB / sA, 'lift': sAB / (sA * sB), 'chi2': chi2,
            'all_conf': sAB / max(sA, sB), 'cosine': sAB / np.sqrt(sA * sB),
            'kulc': 0.5 * (sAB / sA + sAB / sB)}
fi = apriori(T, min_support=0.02, use_colnames=True, max_len=2)
rules = association_rules(fi, metric='confidence', min_threshold=0.5)
out = []
for _, r in rules.iterrows():
    a, b = sorted([list(r['antecedents'])[0], list(r['consequents'])[0]])
    out.append({'rule': f"{a[:24]} <-> {b[:24]}", **measures(N, T[a].sum(), T[b].sum(), (T[a] & T[b]).sum())})
res = pd.DataFrame(out).drop_duplicates('rule').set_index('rule').sort_values('lift', ascending=False)
pd.set_option('display.width', 250)
print("Correlation analysis of frequent item pairs (N = %d baskets)" % N)
print(res.head(10).round(3).to_string())
print("\nPairs where lift and Kulczynski disagree most (lift high, Kulczynski low):")
res['gap'] = res['lift'].rank(ascending=False) - res['kulc'].rank(ascending=False)
print(res.sort_values('gap').head(3)[['support', 'lift', 'chi2', 'all_conf', 'cosine', 'kulc']].round(3).to_string())
# ---- Null invariance ----
print("\nEffect of null transactions (two items A and B bought together in 10,000 baskets):")
for label, n in [("100 null transactions", 12100), ("100,000 null transactions", 112000)]:
    nA, nB, nAB = 11000, 11000, 10000
    m = measures(n, nA, nB, nAB)
    print(f"  {label:<26} lift={m['lift']:7.2f}  chi2={m['chi2']:9.1f}  "
          f"all_conf={m['all_conf']:.2f}  cosine={m['cosine']:.2f}  kulc={m['kulc']:.2f}")
print("Lift and chi-square change drastically; all-confidence, cosine and Kulczynski stay constant.")
cols = ['lift', 'all_conf', 'cosine', 'kulc']
res.head(8)[cols].plot(kind='bar', figsize=(12, 5.2), rot=25)
plt.title("Comparison of correlation measures for the top item pairs"); plt.ylabel("Measure value")
plt.axhline(1, color='gray', linestyle='--', linewidth=0.8); plt.xticks(fontsize=7)
plt.tight_layout(); plt.show()
