from typing import Optional, Dict, Any, List
import numpy as np
import pandas as pd
from sklearn.tree import DecisionTreeClassifier, export_text
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler, FunctionTransformer
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, roc_curve, roc_auc_score
)
from .dataset_service import get_raw_dataframe
from .reduction_service import build_customer_features

def entropy(s: pd.Series) -> float:
    p = s.value_counts(normalize=True)
    return float(-(p * np.log2(p)).sum())

def classify_customers(
    csv_path: Optional[str] = None,
    cutoff_date: str = "2011-09-01",
    algorithm: str = "All",
    tree_criterion: str = "entropy",
    max_depth: Optional[int] = None,
    ccp_alpha: float = 0.005,
    knn_neighbors: int = 7
) -> Dict[str, Any]:
    raw_df = get_raw_dataframe(csv_path)
    X, y, _ = build_customer_features(raw_df, cutoff_date)

    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, random_state=1, stratify=y)
    cv = StratifiedKFold(10, shuffle=True, random_state=1)

    majority_baseline = round(float(max(y.mean(), 1 - y.mean())), 4)
    H_class = round(entropy(y), 4)

    # Information gain binary split for each attribute
    best_splits = []
    for col in X.columns:
        vals = np.unique(X[col].quantile(np.linspace(0.02, 0.98, 30)))
        gains = [
            (
                H_class - (
                    (X[col] <= t).mean() * entropy(y[X[col] <= t]) +
                    (X[col] > t).mean() * entropy(y[X[col] > t])
                ),
                t
            )
            for t in vals
        ]
        if gains:
            best_gain, best_t = max(gains, key=lambda x: x[0])
            best_splits.append({
                "feature": str(col),
                "info_gain": round(float(best_gain), 4),
                "threshold": round(float(best_t), 3)
            })
    best_splits = sorted(best_splits, key=lambda x: x["info_gain"], reverse=True)

    # Define candidate models
    models: Dict[str, Any] = {}
    if algorithm in ["DecisionTree", "All"]:
        models["Decision Tree (Pruned)"] = DecisionTreeClassifier(
            criterion=tree_criterion,
            ccp_alpha=ccp_alpha,
            max_depth=max_depth,
            random_state=1
        )
        models["Decision Tree (Unpruned)"] = DecisionTreeClassifier(
            criterion=tree_criterion,
            random_state=1
        )

    if algorithm in ["NaiveBayes", "All"]:
        models["Naive Bayes"] = make_pipeline(FunctionTransformer(np.log1p), GaussianNB())

    if algorithm in ["KNN", "All"]:
        models[f"kNN (k={knn_neighbors})"] = make_pipeline(
            FunctionTransformer(np.log1p),
            StandardScaler(),
            KNeighborsClassifier(n_neighbors=knn_neighbors)
        )

    model_results = []
    confusion_matrices = {}
    roc_curves_data = {}
    fitted_models = {}

    for name, model in models.items():
        model.fit(Xtr, ytr)
        fitted_models[name] = model

        preds = model.predict(Xte)
        prob = model.predict_proba(Xte)[:, 1] if hasattr(model, "predict_proba") else None

        acc = float(accuracy_score(yte, preds))
        prec = float(precision_score(yte, preds, zero_division=0))
        rec = float(recall_score(yte, preds, zero_division=0))
        f1 = float(f1_score(yte, preds, zero_division=0))
        auc = float(roc_auc_score(yte, prob)) if prob is not None else 0.5
        cv_scores = cross_val_score(model, X, y, cv=cv)

        cm = confusion_matrix(yte, preds).tolist()
        confusion_matrices[name] = {
            "matrix": cm,
            "labels": ["Lapsed (0)", "Active (1)"],
            "tn": cm[0][0], "fp": cm[0][1], "fn": cm[1][0], "tp": cm[1][1]
        }

        if prob is not None:
            fpr, tpr, _ = roc_curve(yte, prob)
            step = max(1, len(fpr) // 30)
            roc_curves_data[name] = [
                {"fpr": round(float(f), 4), "tpr": round(float(t), 4)}
                for f, t in zip(fpr[::step], tpr[::step])
            ]

        model_results.append({
            "model_name": name,
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "auc": round(auc, 4),
            "cv_accuracy_mean": round(float(cv_scores.mean()), 4),
            "cv_accuracy_std": round(float(cv_scores.std()), 4),
            "beats_baseline": bool(cv_scores.mean() > majority_baseline)
        })

    # Pick best model
    best_model = max(model_results, key=lambda m: m["cv_accuracy_mean"])["model_name"]

    # Tree rules and feature importance for Decision Tree
    tree_rules_text = None
    feature_importances = None
    if "Decision Tree (Pruned)" in fitted_models:
        dt = fitted_models["Decision Tree (Pruned)"]
        tree_rules_text = export_text(dt, feature_names=list(X.columns), max_depth=3)
        imp = dt.feature_importances_
        feature_importances = [
            {"feature": str(col), "importance": round(float(val), 4)}
            for col, val in sorted(zip(X.columns, imp), key=lambda x: x[1], reverse=True)
        ]

    # kNN Search across k=1..21
    knn_search = []
    if algorithm in ["KNN", "All"]:
        ks = [1, 3, 5, 7, 9, 11, 15, 21]
        for k in ks:
            pipe = make_pipeline(FunctionTransformer(np.log1p), StandardScaler(), KNeighborsClassifier(k))
            score = cross_val_score(pipe, X, y, cv=cv).mean()
            knn_search.append({"k": k, "cv_accuracy": round(float(score), 4)})

    return {
        "task_description": "Predict whether a customer buys again after cutoff date (1 = active repeat customer, 0 = lapsed customer)",
        "customer_counts": {
            "total": int(len(X)),
            "train": int(len(Xtr)),
            "test": int(len(Xte)),
            "active_1": int((y == 1).sum()),
            "lapsed_0": int((y == 0).sum())
        },
        "majority_baseline": majority_baseline,
        "entropy_class": H_class,
        "best_attribute_splits": best_splits,
        "model_results": model_results,
        "best_model_name": best_model,
        "confusion_matrices": confusion_matrices,
        "feature_importances": feature_importances,
        "tree_rules_text": tree_rules_text,
        "roc_curves": roc_curves_data,
        "knn_k_search": knn_search,
    }
