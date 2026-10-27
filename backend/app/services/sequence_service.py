from typing import Optional, Dict, Any, List
from collections import defaultdict
import numpy as np
import pandas as pd
from .dataset_service import get_raw_dataframe

def analyze_sequences(
    csv_path: Optional[str] = None,
    min_purchases: int = 2,
    top_n_patterns: int = 15
) -> Dict[str, Any]:
    raw_df = get_raw_dataframe(csv_path)

    # Valid sales with known CustomerID
    filt = (
        ~raw_df["InvoiceNo"].astype(str).str.startswith("C")
        & (raw_df["Quantity"] > 0)
        & (raw_df["UnitPrice"] > 0)
        & raw_df["CustomerID"].notnull()
        & (raw_df["CustomerID"] > 0)
    )
    df = raw_df[filt].copy()
    df["Description"] = df["Description"].fillna("").astype(str).str.strip().str.upper()
    df = df[df["Description"] != ""]

    # Deduplicate within same invoice
    invoices = (
        df.groupby(["CustomerID", "InvoiceNo", "InvoiceDate"])["Description"]
        .apply(lambda s: list(set(s)))
        .reset_index()
        .sort_values(["CustomerID", "InvoiceDate"])
    )

    cust_counts = invoices.groupby("CustomerID")["InvoiceNo"].count()
    eligible_custs = cust_counts[cust_counts >= min_purchases].index
    invoices_filt = invoices[invoices["CustomerID"].isin(eligible_custs)]

    # 1. Purchase Intervals
    intervals = []
    transitions = defaultdict(int)
    repeat_product_count = 0
    total_transition_steps = 0

    sample_journeys = []
    sample_ids = list(eligible_custs[:5])

    for cid, group in invoices_filt.groupby("CustomerID"):
        dates = group["InvoiceDate"].tolist()
        baskets = group["Description"].tolist()

        is_sample = cid in sample_ids
        journey_steps = []

        for i in range(len(dates)):
            if is_sample:
                journey_steps.append({
                    "step": i + 1,
                    "date": dates[i].strftime("%Y-%m-%d"),
                    "item_count": len(baskets[i]),
                    "sample_items": baskets[i][:3]
                })

            if i > 0:
                diff_days = (dates[i] - dates[i - 1]).total_seconds() / 86400.0
                if diff_days >= 0:
                    intervals.append(diff_days)

                # Pairwise consecutive transitions between top items in baskets
                prev_basket = baskets[i - 1]
                curr_basket = baskets[i]

                # Check repeat purchases
                overlap = set(prev_basket).intersection(set(curr_basket))
                repeat_product_count += len(overlap)

                for item_a in prev_basket[:5]:
                    for item_b in curr_basket[:5]:
                        transitions[(item_a, item_b)] += 1
                        total_transition_steps += 1

        if is_sample:
            sample_journeys.append({
                "customer_id": int(cid),
                "total_invoices": len(dates),
                "steps": journey_steps
            })

    int_arr = np.array(intervals) if intervals else np.array([0])
    interval_stats = {
        "mean_days": round(float(np.mean(int_arr)), 1),
        "median_days": round(float(np.median(int_arr)), 1),
        "min_days": round(float(np.min(int_arr)), 1),
        "max_days": round(float(np.max(int_arr)), 1),
        "std_days": round(float(np.std(int_arr)), 1),
    }

    # Top sequential transitions (Item at step t -> Item at step t+1)
    sorted_trans = sorted(transitions.items(), key=lambda x: x[1], reverse=True)[:top_n_patterns]
    frequent_transitions = [
        {
            "from_item": k[0][:35],
            "to_item": k[1][:35],
            "frequency": int(v),
            "transition_probability": round(float(v / max(1, total_transition_steps) * 100), 2)
        }
        for k, v in sorted_trans
    ]

    total_eligible = len(eligible_custs)
    total_custs = len(cust_counts)
    repeat_rate = round(float((total_eligible / max(1, total_custs)) * 100), 2)

    return {
        "eligible_customers": total_eligible,
        "total_sequences": len(invoices_filt),
        "avg_sequence_length": round(float(len(invoices_filt) / max(1, total_eligible)), 2),
        "repeat_purchase_rate": repeat_rate,
        "interval_stats": interval_stats,
        "frequent_transitions": frequent_transitions,
        "sample_customer_journeys": sample_journeys,
    }
