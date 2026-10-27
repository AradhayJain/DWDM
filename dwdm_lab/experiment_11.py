import warnings
warnings.filterwarnings("ignore")
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler, FunctionTransformer
from sklearn.metrics import (confusion_matrix, classification_report, accuracy_score, precision_score, recall_score,
                             f1_score, roc_curve, roc_auc_score)
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
log = FunctionTransformer(np.log1p)
models = {'Naive Bayes': make_pipeline(log, GaussianNB()),
          'kNN (k=7)': make_pipeline(log, StandardScaler(), KNeighborsClassifier(n_neighbors=7))}
cv = StratifiedKFold(10, shuffle=True, random_state=1)
summary, fitted = [], {}
for name, m in models.items():
    m.fit(Xtr, ytr); fitted[name] = m
    p = m.predict(Xte); prob = m.predict_proba(Xte)[:, 1]
    print("=" * 62); print(name); print("=" * 62)
    print("Confusion matrix (rows = actual, columns = predicted):")
    print(pd.DataFrame(confusion_matrix(yte, p), index=['lapsed', 'active'], columns=['lapsed', 'active']).to_string())
    print("\n" + classification_report(yte, p, target_names=['lapsed', 'active'], digits=3))
    summary.append([name, accuracy_score(yte, p), precision_score(yte, p), recall_score(yte, p), f1_score(yte, p),
                    roc_auc_score(yte, prob), cross_val_score(m, X, y, cv=cv).mean()])
print("Comparison (class 'active' as positive):")
print(pd.DataFrame(summary, columns=['model', 'accuracy', 'precision', 'recall', 'F-measure', 'AUC', 'cv10_acc']).round(4).to_string(index=False))
# ---- Choosing k for kNN ----
ks = range(1, 31, 2)
cv_k = [cross_val_score(make_pipeline(log, StandardScaler(), KNeighborsClassifier(k)), X, y, cv=cv).mean() for k in ks]
print("\nBest k by 10-fold CV: k =", list(ks)[int(np.argmax(cv_k))], "(accuracy %.4f)" % max(cv_k))
# ---- ROC curves ----
plt.figure(figsize=(6, 5))
for name in models:
    prob = fitted[name].predict_proba(Xte)[:, 1]
    fpr, tpr, _ = roc_curve(yte, prob)
    plt.plot(fpr, tpr, label=f"{name} (AUC = {roc_auc_score(yte, prob):.3f})")
plt.plot([0, 1], [0, 1], 'k--')
plt.title("ROC curves"); plt.xlabel("False positive rate"); plt.ylabel("True positive rate"); plt.legend(loc='lower right')
plt.tight_layout(); plt.show()
