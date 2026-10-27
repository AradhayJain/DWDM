import warnings
warnings.filterwarnings("ignore")
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sqlalchemy import create_engine
from sklearn.preprocessing import StandardScaler, FunctionTransformer
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.tree import DecisionTreeClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import make_pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from mlxtend.frequent_patterns import apriori, association_rules
# ---- Stage 1: Extract ----
dw = create_engine("mysql+pymysql://root:root@127.0.0.1:3306/retail_etl")
df = pd.read_sql("""SELECT f.invoice_no, d.full_date, f.customer_id, c.country, p.description, p.price_band,
                           f.quantity, f.unit_price, f.revenue
                    FROM fact_sales f JOIN dim_date d ON f.date_id = d.date_id
                                      JOIN dim_customer c ON f.customer_id = c.customer_id
                                      JOIN dim_product p ON f.product_id = p.product_id""", dw)
df['full_date'] = pd.to_datetime(df['full_date']); df['revenue'] = df['revenue'].astype(float)
print("STAGE 1 - Warehouse extract: %d sales lines, %d invoices, %d customers (id 0 = guest), %s to %s" % (
      len(df), df['invoice_no'].nunique(), df['customer_id'].nunique(), df['full_date'].min().date(), df['full_date'].max().date()))
# ---- Stage 2: Preprocess ----
CUT = pd.Timestamp('2011-09-01')
known = df[df['customer_id'] > 0]
past, future = known[known['full_date'] < CUT], known[known['full_date'] >= CUT]
cust = past.groupby('customer_id').agg(recency=('full_date', lambda s: (CUT - s.max()).days), frequency=('invoice_no', 'nunique'),
                                       monetary=('revenue', 'sum'), n_products=('description', 'nunique'))
cust['avg_basket'] = cust['monetary'] / cust['frequency']
cust['active_next'] = cust.index.isin(future['customer_id']).astype(int)
Xs = StandardScaler().fit_transform(np.log1p(cust[['recency', 'frequency', 'monetary']]))
print("STAGE 2 - Pre-processing: %d customers with history, log + z-score scaling of RFM, %.0f%% buy again after the cut-off" %
      (len(cust), 100 * cust['active_next'].mean()))
# ---- Stage 3: Cluster ----
km = KMeans(4, n_init=10, random_state=1).fit(Xs)
cust['cluster'] = km.labels_
prof = cust.groupby('cluster').agg(customers=('recency', 'size'), recency=('recency', 'mean'), frequency=('frequency', 'mean'), monetary=('monetary', 'mean'))
names = {prof['monetary'].idxmax(): 'Champions', prof['recency'].idxmax(): 'Lost'}
rest = prof.drop(index=list(names)).sort_values('frequency', ascending=False).index
names[rest[0]], names[rest[1]] = 'Loyal', 'Promising'
cust['segment'] = cust['cluster'].map(names)
seg = cust.groupby('segment').agg(customers=('recency', 'size'), recency=('recency', 'mean'), frequency=('frequency', 'mean'),
                                  monetary=('monetary', 'mean'), buy_again=('active_next', 'mean')).round(2)
print("\nSTAGE 3 - Customer segments (k-means, k=4, silhouette = %.3f):" % silhouette_score(Xs, km.labels_))
print(seg.sort_values('monetary', ascending=False).to_string())
# ---- Stage 4: Classify ----
X, y = cust[['recency', 'frequency', 'monetary', 'n_products', 'avg_basket']], cust['active_next']
cv = StratifiedKFold(10, shuffle=True, random_state=1)
models = {'Decision Tree': DecisionTreeClassifier(criterion='entropy', ccp_alpha=0.005, random_state=1),
          'Naive Bayes': make_pipeline(FunctionTransformer(np.log1p), GaussianNB()),
          'kNN (k=15)': make_pipeline(FunctionTransformer(np.log1p), StandardScaler(), KNeighborsClassifier(15))}
acc = pd.Series({n: cross_val_score(m, X, y, cv=cv).mean() for n, m in models.items()})
print("\nSTAGE 4 - Classification, 10-fold CV accuracy (majority-class baseline = %.3f):" % max(y.mean(), 1 - y.mean()))
print(acc.round(4).to_string())
# ---- Stage 5: Association rules ----
uk = df[(df['country'] == 'United Kingdom') & ~df['description'].isin(['POSTAGE', 'MANUAL'])]
top = uk.groupby('description')['invoice_no'].nunique().nlargest(60).index
B = (uk[uk['description'].isin(top)].drop_duplicates(['invoice_no', 'description']).assign(v=True)
     .pivot(index='invoice_no', columns='description', values='v').fillna(False).astype(bool))
rules = association_rules(apriori(B[B.sum(axis=1) >= 2], min_support=0.02, use_colnames=True), metric='confidence', min_threshold=0.6)
rules = rules.sort_values('lift', ascending=False).head(3)
print("\nSTAGE 5 - Strongest product association rules (support >= 0.02, confidence >= 0.6):")
for _, r in rules.iterrows():
    print("  {%s} -> {%s}  conf=%.2f lift=%.1f" % (", ".join(sorted(r['antecedents']))[:60], ", ".join(sorted(r['consequents']))[:40], r['confidence'], r['lift']))
# ---- Stage 6: Forecast ----
weekly = df.set_index('full_date')['revenue'].resample('W').sum()
weekly = weekly.iloc[1:-1]
train, test = weekly.iloc[:-8], weekly.iloc[-8:]
t = np.arange(len(train)); slope, icpt = np.polyfit(t, train.values, 1)
fc = {'Naive (last value)': np.repeat(train.iloc[-1], 8),
      'Moving average (4 wk)': np.repeat(train.iloc[-4:].mean(), 8),
      'Linear trend': icpt + slope * np.arange(len(train), len(train) + 8)}
mape = {k: float(np.mean(np.abs((test.values - v) / test.values)) * 100) for k, v in fc.items()}
print("\nSTAGE 6 - Weekly revenue forecast for the last 8 weeks (MAPE, lower is better):")
print(pd.Series(mape).round(1).to_string())
print("Weekly trend: %+.0f GBP per week" % slope)
# ---- Stage 7: Text mining ----
prod = df.groupby('description')['revenue'].sum().nlargest(1500)
tf = TfidfVectorizer(stop_words='english', min_df=3, token_pattern=r'[A-Z]{3,}', lowercase=False)
M = tf.fit_transform(prod.index)
kt = KMeans(6, n_init=10, random_state=1).fit(M)
terms = np.array(tf.get_feature_names_out())
print("\nSTAGE 7 - Text mining: %d product descriptions grouped into 6 themes by TF-IDF + k-means" % len(prod))
for k in range(6):
    top_t = terms[np.argsort(kt.cluster_centers_[k])[::-1][:4]]
    print(f"  theme {k}: {np.sum(kt.labels_ == k):>4} products | key terms: {', '.join(top_t)}")
word_rev = pd.Series({w: prod[[w in d.split() for d in prod.index]].sum() for w in terms}).nlargest(10)
# ---- Report ----
fig, ax = plt.subplots(2, 2, figsize=(12, 8.5))
Z = PCA(2).fit_transform(Xs)
for s in seg.index:
    m = (cust['segment'] == s).values; ax[0, 0].scatter(Z[m, 0], Z[m, 1], s=8, label=s)
ax[0, 0].set_title("Customer segments (PCA of RFM)"); ax[0, 0].legend(markerscale=2)
ax[0, 1].plot(weekly.index, weekly.values / 1000, color='gray', label='Weekly revenue')
for (k, v), c in zip(fc.items(), ['tab:orange', 'tab:green', 'tab:red']):
    ax[0, 1].plot(test.index, v / 1000, '--', color=c, label=f"{k} (MAPE {mape[k]:.0f}%)")
ax[0, 1].axvline(test.index[0], color='k', linestyle=':'); ax[0, 1].set_title("Weekly revenue and 8-week forecast")
ax[0, 1].set_ylabel("Thousand GBP"); ax[0, 1].legend(fontsize=8); ax[0, 1].tick_params(axis='x', rotation=30)
acc.plot(kind='bar', ax=ax[1, 0], rot=15, color='steelblue'); ax[1, 0].set_ylim(0.5, 0.8)
ax[1, 0].axhline(max(y.mean(), 1 - y.mean()), color='r', linestyle='--', label='Majority-class baseline')
ax[1, 0].set_title("Classifier accuracy (10-fold CV)"); ax[1, 0].legend()
seg['monetary'].sort_values().plot(kind='barh', ax=ax[1, 1], color='darkorange'); ax[1, 1].set_title("Average spend per customer by segment (GBP)")
plt.tight_layout(); plt.show()
plt.figure(figsize=(8, 4.2))
(word_rev / 1000).sort_values().plot(kind='barh', color='teal'); plt.title("Revenue by description keyword (thousand GBP)")
plt.tight_layout(); plt.show()
