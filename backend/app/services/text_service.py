from typing import Optional, Dict, Any, List
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
from sklearn.metrics.pairwise import cosine_similarity
from .dataset_service import get_raw_dataframe

def mine_text_database(
    csv_path: Optional[str] = None,
    query: Optional[str] = None,
    top_products_count: int = 1500,
    n_clusters: int = 6,
    min_df: int = 3
) -> Dict[str, Any]:
    raw_df = get_raw_dataframe(csv_path)

    filt = (
        ~raw_df["InvoiceNo"].astype(str).str.startswith("C")
        & (raw_df["Quantity"] > 0)
        & (raw_df["UnitPrice"] > 0)
    )
    df = raw_df[filt].copy()
    df["revenue"] = df["Quantity"] * df["UnitPrice"]
    df["Description"] = df["Description"].fillna("").astype(str).str.strip().str.upper()
    df = df[df["Description"].str.len() > 3]

    # Top products by revenue
    prod_rev = df.groupby("Description")["revenue"].sum().nlargest(top_products_count)
    descriptions = list(prod_rev.index)

    # 1. TF-IDF Vectorization
    tf = TfidfVectorizer(
        stop_words="english",
        min_df=min_df,
        token_pattern=r"[a-zA-Z]{3,}",
        ngram_range=(1, 2)
    )
    M = tf.fit_transform(descriptions)
    terms = np.array(tf.get_feature_names_out())

    # Top overall TF-IDF terms
    mean_tfidf = np.array(M.mean(axis=0)).flatten()
    top_term_indices = np.argsort(mean_tfidf)[::-1][:20]
    top_terms = [
        {"term": str(terms[i]), "score": round(float(mean_tfidf[i]), 4)}
        for i in top_term_indices
    ]

    # 2. Description Clustering (Themes)
    n_cl = min(n_clusters, len(descriptions))
    km = KMeans(n_clusters=n_cl, n_init=5, random_state=1).fit(M)
    labels = km.labels_

    themes = []
    for k in range(n_cl):
        cluster_terms = terms[np.argsort(km.cluster_centers_[k])[::-1][:5]]
        sample_prods = [descriptions[i] for i in np.where(labels == k)[0][:3]]
        cluster_rev = float(prod_rev.iloc[labels == k].sum())
        themes.append({
            "theme_id": k + 1,
            "product_count": int(np.sum(labels == k)),
            "top_keywords": list(cluster_terms),
            "total_revenue": round(cluster_rev, 2),
            "sample_products": sample_prods
        })
    themes = sorted(themes, key=lambda x: x["total_revenue"], reverse=True)

    # 3. Query Similarity Search
    similarity_results = None
    if query and query.strip():
        q_vec = tf.transform([query.strip().upper()])
        sims = cosine_similarity(q_vec, M).flatten()
        top_sim_indices = np.argsort(sims)[::-1][:10]
        similarity_results = [
            {
                "description": descriptions[i],
                "similarity_score": round(float(sims[i]), 4),
                "revenue": round(float(prod_rev.iloc[i]), 2)
            }
            for i in top_sim_indices if sims[i] > 0
        ]

    # 4. Keyword-level Revenue Aggregation
    # Compute revenue for top unigram words
    unigram_terms = [t for t in terms if " " not in t][:50]
    kw_rev = {}
    for w in unigram_terms:
        mask = [w in d.split() for d in prod_rev.index]
        rev_sum = prod_rev[mask].sum()
        if rev_sum > 0:
            kw_rev[w] = float(rev_sum)

    top_kw_revenue = [
        {"keyword": k, "revenue": round(v, 2)}
        for k, v in sorted(kw_rev.items(), key=lambda x: x[1], reverse=True)[:15]
    ]

    return {
        "corpus_size": len(descriptions),
        "vocab_size": len(terms),
        "top_terms": top_terms,
        "themes": themes,
        "similarity_results": similarity_results,
        "keyword_revenue": top_kw_revenue,
    }
