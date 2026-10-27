import warnings
warnings.filterwarnings("ignore")
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy.cluster.hierarchy import linkage, dendrogram
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans, AgglomerativeClustering, DBSCAN
from sklearn.metrics import silhouette_score
# ---- Data preparation ----
df = pd.read_csv('Online_Retail.csv', encoding='latin-1')
df['InvoiceDate'] = pd.to_datetime(df['InvoiceDate'], format='%m/%d/%Y %H:%M')
df['Revenue'] = df['Quantity'] * df['UnitPrice']
cancelled = df['InvoiceNo'].astype(str).str.startswith('C')
sales = df[~cancelled & (df['Quantity'] > 0) & (df['UnitPrice'] > 0)].dropna(subset=['CustomerID']).drop_duplicates()
returns = df[cancelled].dropna(subset=['CustomerID'])
# ---- Customer features ----
CUTOFF = pd.Timestamp('2011-09-01')
past = sales[sales['InvoiceDate'] < CUTOFF]
future = sales[sales['InvoiceDate'] >= CUTOFF]
cust = past.groupby('CustomerID').agg(
    recency=('InvoiceDate', lambda s: (CUTOFF - s.max()).days),
    tenure=('InvoiceDate', lambda s: (CUTOFF - s.min()).days),
    frequency=('InvoiceNo', 'nunique'),
    monetary=('Revenue', 'sum'),
    total_qty=('Quantity', 'sum'),
    n_products=('StockCode', 'nunique'),
    avg_unit_price=('UnitPrice', 'mean'))
cust['avg_basket'] = cust['monetary'] / cust['frequency']
cust['n_returns'] = returns[returns['InvoiceDate'] < CUTOFF].groupby('CustomerID')['InvoiceNo'].nunique()
cust['n_returns'] = cust['n_returns'].fillna(0).astype(int)
cust['is_uk'] = past.groupby('CustomerID')['Country'].agg(lambda s: int(s.iloc[0] == 'United Kingdom'))
cust['active_next'] = cust.index.isin(future['CustomerID']).astype(int)
rfm = cust[['recency', 'frequency', 'monetary']].copy()
Xs = StandardScaler().fit_transform(np.log1p(rfm))
print("Clustering %d customers on Recency, Frequency and Monetary value (log-scaled)" % len(rfm))
# ---- 1. K-means ----
ks = range(2, 10)
inertia, sil = [], []
for k in ks:
    km = KMeans(n_clusters=k, n_init=10, random_state=1).fit(Xs)
    inertia.append(km.inertia_); sil.append(silhouette_score(Xs, km.labels_))
print("\nk-means validation")
print(pd.DataFrame({'k': list(ks), 'SSE(inertia)': np.round(inertia, 1), 'silhouette': np.round(sil, 4)}).to_string(index=False))
print("\nBest k by silhouette:", list(ks)[int(np.argmax(sil))], "| k = 4 chosen (elbow and business interpretation)")
km = KMeans(n_clusters=4, n_init=10, random_state=1).fit(Xs)
rfm['cluster'] = km.labels_
prof = rfm.groupby('cluster').agg(customers=('recency', 'size'), recency=('recency', 'mean'), frequency=('frequency', 'mean'), monetary=('monetary', 'mean')).round(1)
print("\nCluster profile (k-means, k=4):"); print(prof.to_string())
print("Silhouette = %.4f" % silhouette_score(Xs, km.labels_))
# ---- 2. Hierarchical ----
link = linkage(Xs, method='ward')
hc = AgglomerativeClustering(n_clusters=4, linkage='ward').fit(Xs)
print("\nHierarchical (Ward, 4 clusters): sizes =", np.bincount(hc.labels_).tolist(), "| silhouette = %.4f" % silhouette_score(Xs, hc.labels_))
print("Agreement with k-means (cross-tabulation):")
print(pd.crosstab(km.labels_, hc.labels_, rownames=['k-means'], colnames=['hierarchical']).to_string())
# ---- 3. DBSCAN ----
db = DBSCAN(eps=0.45, min_samples=10).fit(Xs)
labels = db.labels_
print("\nDBSCAN (eps=0.45, min_samples=10): clusters = %d, noise points = %d (%.1f%%)" %
      (len(set(labels)) - (1 if -1 in labels else 0), (labels == -1).sum(), 100 * (labels == -1).mean()))
print("Cluster sizes (-1 = noise):", {int(k): int(v) for k, v in zip(*np.unique(labels, return_counts=True))})
out = rfm[labels == -1].sort_values('monetary', ascending=False)
print("\nLargest outlier customers detected by DBSCAN:")
print(out[['recency', 'frequency', 'monetary']].head(6).round(1).to_string())
# ---- Plots ----
fig, ax = plt.subplots(1, 2, figsize=(11, 4))
ax[0].plot(list(ks), inertia, 'o-'); ax[0].axvline(4, color='r', linestyle='--')
ax[0].set_title("Elbow method"); ax[0].set_xlabel("k"); ax[0].set_ylabel("SSE")
ax[1].plot(list(ks), sil, 's-', color='green'); ax[1].set_title("Silhouette score"); ax[1].set_xlabel("k")
plt.tight_layout(); plt.show()
plt.figure(figsize=(8, 4.5))
dendrogram(link, truncate_mode='lastp', p=30, no_labels=True); plt.title("Dendrogram (Ward, last 30 merges)")
plt.tight_layout(); plt.show()
