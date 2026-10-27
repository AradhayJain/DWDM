import time
from typing import Optional, Dict, Any, List
import numpy as np
import pandas as pd
from scipy.stats import chi2_contingency
from mlxtend.frequent_patterns import apriori, fpgrowth, association_rules
from .dataset_service import get_raw_dataframe

def compute_measures(n: int, nA: int, nB: int, nAB: int) -> Dict[str, float]:
    sA, sB, sAB = nA / n, nB / n, nAB / n
    table = [[nAB, nA - nAB], [nB - nAB, n - nA - nB + nAB]]
    try:
        chi2 = float(chi2_contingency(table, correction=False)[0])
    except Exception:
        chi2 = 0.0

    lift = sAB / (sA * sB) if (sA * sB) > 0 else 0.0
    all_conf = sAB / max(sA, sB) if max(sA, sB) > 0 else 0.0
    cosine = sAB / np.sqrt(sA * sB) if (sA * sB) > 0 else 0.0
    kulc = 0.5 * ((sAB / sA) + (sAB / sB)) if (sA > 0 and sB > 0) else 0.0

    return {
        "support": round(float(sAB), 4),
        "confidence": round(float(sAB / sA), 4) if sA > 0 else 0.0,
        "lift": round(float(lift), 3),
        "chi2": round(float(chi2), 2),
        "all_conf": round(float(all_conf), 4),
        "cosine": round(float(cosine), 4),
        "kulc": round(float(kulc), 4),
    }

def mine_association_rules(
    csv_path: Optional[str] = None,
    country: str = "United Kingdom",
    min_support: float = 0.02,
    min_confidence: float = 0.6,
    top_n_items: int = 100,
    compare_algorithms: bool = True
) -> Dict[str, Any]:
    raw_df = get_raw_dataframe(csv_path)

    df = raw_df.drop_duplicates()
    filt = (
        ~df["InvoiceNo"].astype(str).str.startswith("C")
        & (df["Quantity"] > 0)
        & (df["UnitPrice"] > 0)
    )
    if country and country.lower() != "all":
        filt = filt & (df["Country"] == country)

    df = df[filt].dropna(subset=["Description"])
    df["Description"] = df["Description"].astype(str).str.strip().str.upper()
    non_merch = ["POSTAGE", "MANUAL", "DOTCOM POSTAGE", "CARRIAGE"]
    df = df[~df["Description"].isin(non_merch)]

    top_items = df.groupby("Description")["InvoiceNo"].nunique().nlargest(top_n_items).index
    df_top = df[df["Description"].isin(top_items)]

    T = (
        df_top.drop_duplicates(["InvoiceNo", "Description"])
        .assign(v=True)
        .pivot(index="InvoiceNo", columns="Description", values="v")
        .fillna(False)
        .astype(bool)
    )
    # Baskets with at least 2 items
    T = T[T.sum(axis=1) >= 2]
    n_baskets = int(T.shape[0])
    n_items = int(T.shape[1])
    avg_basket_size = round(float(T.sum(axis=1).mean()), 2)

    top_frequent = [
        {"item": str(col), "support": round(float(sup), 4)}
        for col, sup in T.mean().sort_values(ascending=False).head(10).items()
    ]

    # Benchmarking Apriori vs FP-Growth
    t0 = time.perf_counter()
    fi_apriori = apriori(T, min_support=min_support, use_colnames=True)
    apr_ms = round((time.perf_counter() - t0) * 1000, 2)

    t1 = time.perf_counter()
    fi_fpgrowth = fpgrowth(T, min_support=min_support, use_colnames=True)
    fp_ms = round((time.perf_counter() - t1) * 1000, 2)

    fi = fi_apriori
    fi["size"] = fi["itemsets"].apply(len)
    itemsets_by_size = {str(k): int(v) for k, v in fi.groupby("size").size().items()}

    rules = association_rules(fi, metric="confidence", min_threshold=min_confidence)
    rules = rules.sort_values("lift", ascending=False)

    rules_list = []
    for _, r in rules.head(50).iterrows():
        ant = list(r["antecedents"])
        con = list(r["consequents"])
        rules_list.append({
            "antecedents": ant,
            "consequents": con,
            "support": round(float(r["support"]), 4),
            "confidence": round(float(r["confidence"]), 4),
            "lift": round(float(r["lift"]), 3),
            "leverage": round(float(r.get("leverage", 0)), 4),
            "conviction": round(float(r.get("conviction", 0)), 3) if not np.isinf(r.get("conviction", 0)) else 999.0,
        })

    # Algorithm comparison across multiple supports (Experiment 8)
    alg_comp = []
    if compare_algorithms:
        for s in [0.03, 0.02, 0.015, 0.01]:
            t_a0 = time.perf_counter()
            fa = apriori(T, min_support=s, use_colnames=True)
            ta = round((time.perf_counter() - t_a0) * 1000, 1)

            t_f0 = time.perf_counter()
            ff = fpgrowth(T, min_support=s, use_colnames=True)
            tf = round((time.perf_counter() - t_f0) * 1000, 1)

            ra = association_rules(fa, metric="confidence", min_threshold=0.5) if len(fa) > 1 else pd.DataFrame()
            rf = association_rules(ff, metric="confidence", min_threshold=0.5) if len(ff) > 1 else pd.DataFrame()

            alg_comp.append({
                "min_support": s,
                "apriori_itemsets": len(fa),
                "apriori_rules": len(ra),
                "apriori_ms": ta,
                "fpgrowth_itemsets": len(ff),
                "fpgrowth_rules": len(rf),
                "fpgrowth_ms": tf,
                "identical_results": bool(set(fa["itemsets"]) == set(ff["itemsets"])) if not fa.empty and not ff.empty else True
            })

    # Correlation measures on frequent pairs (Experiment 9)
    fi2 = apriori(T, min_support=min_support, use_colnames=True, max_len=2)
    rules2 = association_rules(fi2, metric="confidence", min_threshold=0.5) if len(fi2) > 1 else pd.DataFrame()
    measures_list = []
    seen_pairs = set()
    for _, r in rules2.iterrows():
        a = list(r["antecedents"])[0]
        b = list(r["consequents"])[0]
        pair_key = tuple(sorted([a, b]))
        if pair_key in seen_pairs:
            continue
        seen_pairs.add(pair_key)
        nA = int(T[a].sum())
        nB = int(T[b].sum())
        nAB = int((T[a] & T[b]).sum())
        m = compute_measures(n_baskets, nA, nB, nAB)
        measures_list.append({
            "pair": f"{pair_key[0]} <-> {pair_key[1]}",
            "item_a": pair_key[0],
            "item_b": pair_key[1],
            **m
        })
    measures_list = sorted(measures_list, key=lambda x: x["lift"], reverse=True)[:15]

    # Null invariance demo (Experiment 9)
    null_demo = []
    for label, n_total in [("100 null transactions", 12100), ("100,000 null transactions", 112000)]:
        m = compute_measures(n_total, 11000, 11000, 10000)
        null_demo.append({
            "condition": label,
            "total_transactions": n_total,
            "lift": m["lift"],
            "chi2": m["chi2"],
            "all_conf": m["all_conf"],
            "cosine": m["cosine"],
            "kulc": m["kulc"]
        })

    return {
        "baskets_count": n_baskets,
        "items_count": n_items,
        "avg_basket_size": avg_basket_size,
        "top_frequent_items": top_frequent,
        "itemsets_count": len(fi),
        "itemsets_by_size": itemsets_by_size,
        "rules_count": len(rules),
        "rules": rules_list,
        "algorithm_comparison": alg_comp,
        "measures_table": measures_list,
        "null_invariance_demo": null_demo,
    }
