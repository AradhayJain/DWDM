import warnings
warnings.filterwarnings("ignore")
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.tree import DecisionTreeClassifier, plot_tree, export_text
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report
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
X, y = cust.drop(columns='active_next'), cust['active_next']
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, random_state=1, stratify=y)
print("Task: predict whether a customer buys again after 1 Sep 2011 (1 = active, 0 = lapsed)")
print("Customers:", len(X), "| training:", len(Xtr), "| test:", len(Xte), "| class counts:", y.value_counts().to_dict())
# ---- Root information gain ----
def entropy(s):
    p = s.value_counts(normalize=True)
    return -(p * np.log2(p)).sum()
H = entropy(y)
print("\nEntropy of the class attribute: %.4f bits" % H)
best = {}
for col in X.columns:
    vals = np.unique(X[col].quantile(np.linspace(0.02, 0.98, 49)))
    gains = [(H - ((X[col] <= t).mean() * entropy(y[X[col] <= t]) + (X[col] > t).mean() * entropy(y[X[col] > t])), t) for t in vals]
    best[col] = max(gains)
gain = pd.DataFrame(best, index=['info_gain', 'threshold']).T.sort_values('info_gain', ascending=False)
print("Best binary split of each attribute:"); print(gain.round(4).head(5).to_string())
# ---- Unpruned tree ----
full = DecisionTreeClassifier(criterion='entropy', random_state=1).fit(Xtr, ytr)
print("\nUnpruned tree: depth=%d, leaves=%d, train acc=%.4f, test acc=%.4f" %
      (full.get_depth(), full.get_n_leaves(), full.score(Xtr, ytr), full.score(Xte, yte)))
# ---- Pruning ----
cv = StratifiedKFold(10, shuffle=True, random_state=1)
rows = []
for d in [2, 3, 4, 5, 8, None]:
    m = DecisionTreeClassifier(criterion='entropy', max_depth=d, random_state=1)
    rows.append(['max_depth=%s' % d, m.fit(Xtr, ytr).get_n_leaves(), m.score(Xte, yte), cross_val_score(m, X, y, cv=cv).mean()])
for a in [0.002, 0.005, 0.01, 0.02]:
    m = DecisionTreeClassifier(criterion='entropy', ccp_alpha=a, random_state=1)
    rows.append(['ccp_alpha=%.3f' % a, m.fit(Xtr, ytr).get_n_leaves(), m.score(Xte, yte), cross_val_score(m, X, y, cv=cv).mean()])
res = pd.DataFrame(rows, columns=['setting', 'leaves', 'test_acc', 'cv10_acc'])
print("\nPruning results:"); print(res.round(4).to_string(index=False))
# ---- Final pruned model ----
pruned = DecisionTreeClassifier(criterion='entropy', ccp_alpha=0.005, random_state=1).fit(Xtr, ytr)
pred = pruned.predict(Xte)
scores = cross_val_score(pruned, X, y, cv=cv)
print("\nPruned tree (ccp_alpha=0.005): leaves=%d, test accuracy=%.4f, 10-fold CV accuracy=%.4f (+/- %.4f)" %
      (pruned.get_n_leaves(), accuracy_score(yte, pred), scores.mean(), scores.std()))
print("\nTree rules (first three levels):")
print(export_text(pruned, feature_names=list(X.columns), max_depth=3))
print("Confusion matrix (rows = actual, columns = predicted):")
print(pd.DataFrame(confusion_matrix(yte, pred), index=['lapsed', 'active'], columns=['lapsed', 'active']).to_string())
print(classification_report(yte, pred, target_names=['lapsed', 'active'], digits=3))
print("Attribute importance:"); print(pd.Series(pruned.feature_importances_, index=X.columns).sort_values(ascending=False).head(5).round(3).to_string())
plt.figure(figsize=(14, 7))
plot_tree(pruned, feature_names=list(X.columns), class_names=['lapsed', 'active'], filled=True, fontsize=7, max_depth=3, proportion=True)
plt.title("Pruned decision tree (entropy, ccp_alpha = 0.005) - first three levels")
plt.show()
