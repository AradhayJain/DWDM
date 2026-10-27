from typing import Optional, Dict, Any, List
import numpy as np
import pandas as pd
from scipy.cluster.hierarchy import linkage, dendrogram
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans, AgglomerativeClustering, DBSCAN
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score
from .dataset_service import get_raw_dataframe
from .reduction_service import build_customer_features

def cluster_customers(
    csv_path: Optional[str] = None,
    cutoff_date: str = "2011-09-01",
    n_clusters: int = 4,
    dbscan_eps: float = 0.45,
    dbscan_min_samples: int = 10
) -> Dict[str, Any]:
    raw_df = get_raw_dataframe(csv_path)
    X, y, _ = build_customer_features(raw_df, cutoff_date)

    rfm = X[["recency", "frequency", "monetary"]].copy()
    Xs = StandardScaler().fit_transform(np.log1p(rfm))

    # 1. Elbow & Silhouette Validation (k=2..8)
    ks = list(range(2, 9))
    inertia_list = []
    silhouette_list = []
    for k in ks:
        km_test = KMeans(n_clusters=k, n_init=5, random_state=1).fit(Xs)
        inertia_list.append({"k": k, "sse": round(float(km_test.inertia_), 1)})
        sil = float(silhouette_score(Xs, km_test.labels_))
        silhouette_list.append({"k": k, "silhouette": round(sil, 4)})

    best_k_sil = max(silhouette_list, key=lambda x: x["silhouette"])["k"]

    # 2. Chosen K-Means
    km = KMeans(n_clusters=n_clusters, n_init=10, random_state=1).fit(Xs)
    rfm["cluster"] = km.labels_
    overall_sil = round(float(silhouette_score(Xs, km.labels_)), 4)

    # Segment naming based on metrics
    prof = rfm.groupby("cluster").agg(
        customers=("recency", "size"),
        recency=("recency", "mean"),
        frequency=("frequency", "mean"),
        monetary=("monetary", "mean")
    )

    names = {}
    if len(prof) >= 4:
        champ_id = int(prof["monetary"].idxmax())
        lost_id = int(prof["recency"].idxmax())
        names[champ_id] = "Champions"
        names[lost_id] = "Lost / Inactive"

        rem = [idx for idx in prof.index if idx not in names]
        rem_sorted = prof.loc[rem].sort_values("frequency", ascending=False).index
        if len(rem_sorted) > 0:
            names[int(rem_sorted[0])] = "Loyal Customers"
        if len(rem_sorted) > 1:
            names[int(rem_sorted[1])] = "Promising / Recent"
        for idx in rem_sorted[2:]:
            names[int(idx)] = f"Segment {idx}"
    else:
        for idx in prof.index:
            names[int(idx)] = f"Cluster {idx}"

    rfm["segment"] = rfm["cluster"].map(names)

    cluster_profiles = []
    for c_id in sorted(rfm["cluster"].unique()):
        sub = rfm[rfm["cluster"] == c_id]
        cluster_profiles.append({
            "cluster_id": int(c_id),
            "segment_name": names.get(c_id, f"Cluster {c_id}"),
            "customer_count": int(len(sub)),
            "percentage": round(float(len(sub) / len(rfm) * 100), 2),
            "avg_recency_days": round(float(sub["recency"].mean()), 1),
            "avg_frequency_invoices": round(float(sub["frequency"].mean()), 1),
            "avg_monetary_revenue": round(float(sub["monetary"].mean()), 2),
        })

    # PCA 2D coordinates for visual scatter plot
    pca2 = PCA(n_components=2).fit_transform(Xs)
    step = max(1, len(pca2) // 400)
    pca_scatter = [
        {
            "customer_id": int(rfm.index[i]),
            "x": round(float(pca2[i, 0]), 3),
            "y": round(float(pca2[i, 1]), 3),
            "cluster": int(rfm["cluster"].iloc[i]),
            "segment": str(rfm["segment"].iloc[i]),
            "recency": int(rfm["recency"].iloc[i]),
            "frequency": int(rfm["frequency"].iloc[i]),
            "monetary": round(float(rfm["monetary"].iloc[i]), 1)
        }
        for i in range(0, len(pca2), step)
    ]

    # 3. Hierarchical Clustering (Ward)
    hc = AgglomerativeClustering(n_clusters=n_clusters, linkage="ward").fit(Xs)
    hc_sizes = [int(x) for x in np.bincount(hc.labels_)]
    hc_sil = round(float(silhouette_score(Xs, hc.labels_)), 4)

    ct = pd.crosstab(km.labels_, hc.labels_)
    hc_agreement = {
        "kmeans_labels": [int(k) for k in ct.index],
        "hierarchical_labels": [int(c) for c in ct.columns],
        "matrix": ct.values.tolist()
    }

    # Dendrogram representation
    link = linkage(Xs[:min(500, len(Xs))], method="ward")
    dendro = dendrogram(link, truncate_mode="lastp", p=20, no_plot=True)
    dendrogram_data = {
        "icoord": [[round(float(v), 2) for v in line] for line in dendro["icoord"][:25]],
        "dcoord": [[round(float(v), 2) for v in line] for line in dendro["dcoord"][:25]],
        "ivl": dendro["ivl"][:25]
    }

    # 4. DBSCAN Outlier Detection
    db = DBSCAN(eps=dbscan_eps, min_samples=dbscan_min_samples).fit(Xs)
    db_labels = db.labels_
    n_db_clusters = len(set(db_labels)) - (1 if -1 in db_labels else 0)
    noise_count = int((db_labels == -1).sum())
    noise_pct = round(float((noise_count / len(rfm)) * 100), 2)

    outliers_df = rfm[db_labels == -1].sort_values("monetary", ascending=False).head(10)
    outlier_samples = [
        {
            "customer_id": int(idx),
            "recency": int(row["recency"]),
            "frequency": int(row["frequency"]),
            "monetary": round(float(row["monetary"]), 2),
            "reason": "DBSCAN low-density noise point (extreme spender or unusual RFM profile)"
        }
        for idx, row in outliers_df.iterrows()
    ]

    return {
        "total_customers": int(len(rfm)),
        "features_used": ["recency", "frequency", "monetary"],
        "elbow_inertia": inertia_list,
        "silhouette_by_k": silhouette_list,
        "best_k_silhouette": best_k_sil,
        "chosen_k": n_clusters,
        "cluster_profiles": cluster_profiles,
        "overall_silhouette": overall_sil,
        "pca_scatter": pca_scatter,
        "hierarchical_sizes": hc_sizes,
        "hierarchical_silhouette": hc_sil,
        "hierarchical_agreement": hc_agreement,
        "dendrogram_data": dendrogram_data,
        "dbscan_clusters": n_db_clusters,
        "dbscan_noise_count": noise_count,
        "dbscan_noise_percent": noise_pct,
        "outlier_samples": outlier_samples,
    }
