import warnings
warnings.filterwarnings("ignore")
import numpy as np
import pandas as pd
from sklearn.feature_selection import mutual_info_classif, RFE
from sklearn.linear_model import LogisticRegression
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler, KBinsDiscretizer
CSV_PATH = 'Online_Retail.csv'
# ---- Data preparation ----
df = pd.read_csv(CSV_PATH, encoding='latin-1')
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
X, y = cust.drop(columns='active_next'), cust['active_next']
print("Customer table:", X.shape[0], "customers x", X.shape[1], "attributes | class balance:", y.value_counts().to_dict())
# ---- 1. Attribute subset selection ----
print("\n=== Attribute subset selection ===")
scores = pd.DataFrame({'InfoGain(MI)': mutual_info_classif(X, y, random_state=1)}, index=X.columns).round(3)
print(scores.sort_values('InfoGain(MI)', ascending=False).to_string())
Xs = StandardScaler().fit_transform(X)
rfe = RFE(LogisticRegression(max_iter=1000), n_features_to_select=4).fit(Xs, y)
print("\nTop-4 attributes by RFE (backward elimination):", list(X.columns[rfe.support_]))
corr = X.corr()
pairs = [(a, b, float(round(corr.loc[a, b], 2))) for i, a in enumerate(X.columns)
         for b in X.columns[i + 1:] if abs(corr.loc[a, b]) > 0.8]
print("Highly correlated (redundant) pairs, |r| > 0.8:", pairs)
# ---- 2. PCA ----
print("\n=== PCA (on standardised attributes) ===")
pca = PCA().fit(Xs)
evr = pca.explained_variance_ratio_
print("Explained variance ratio:", evr.round(3))
print("Cumulative variance     :", np.cumsum(evr).round(3))
print("Components needed for 90%% variance: %d of %d" % (np.argmax(np.cumsum(evr) >= 0.90) + 1, X.shape[1]))
load = pd.DataFrame(pca.components_[:2], columns=X.columns, index=['PC1', 'PC2']).round(2)
print("\nLoadings of the first two components:")
print(load.to_string())
# ---- 3. Binning ----
print("\n=== Discretisation of monetary (4 bins) ===")
col = X[['monetary']]
ew = KBinsDiscretizer(4, encode='ordinal', strategy='uniform').fit(col)
ef = KBinsDiscretizer(4, encode='ordinal', strategy='quantile').fit(col)
print("Equal-width edges    :", ew.bin_edges_[0].round(0))
print("Equal-frequency edges:", ef.bin_edges_[0].round(0))
print("Customers per bin (equal-width)    :", np.bincount(ew.transform(col).ravel().astype(int)).tolist())
print("Customers per bin (equal-frequency):", np.bincount(ef.transform(col).ravel().astype(int)).tolist())
# ---- 4. Hierarchies ----
print("\n=== Concept hierarchies ===")
cust['spend_level'] = pd.qcut(cust['monetary'], [0, .25, .75, .95, 1], labels=['low', 'medium', 'high', 'top'])
print(pd.crosstab(cust['spend_level'], cust['active_next'], margins=True).to_string())
d = past.sample(4, random_state=2)[['InvoiceDate']].assign(
    day=lambda t: t.InvoiceDate.dt.date,
    month=lambda t: t.InvoiceDate.dt.strftime('%Y-%m'),
    quarter=lambda t: t.InvoiceDate.dt.to_period('Q').astype(str),
    year=lambda t: t.InvoiceDate.dt.year).drop(columns='InvoiceDate')
print("\nTime hierarchy day < month < quarter < year:")
print(d.to_string(index=False))
region = {'United Kingdom': 'UK', 'Germany': 'Europe', 'France': 'Europe', 'EIRE': 'Europe', 'Spain': 'Europe',
          'Netherlands': 'Europe', 'Belgium': 'Europe', 'Switzerland': 'Europe', 'Portugal': 'Europe'}
rg = sales['Country'].map(region).fillna('Rest of world')
print("\nLocation hierarchy country < region (revenue share):")
print((sales.groupby(rg)['Revenue'].sum() / sales['Revenue'].sum()).round(3).to_string())
