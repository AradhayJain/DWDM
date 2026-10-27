from typing import Optional, Dict, Any, List
import numpy as np
import pandas as pd
from .dataset_service import get_raw_dataframe

def analyze_timeseries(
    csv_path: Optional[str] = None,
    frequency: str = "W", # "D", "W", "M"
    forecast_horizon: int = 8
) -> Dict[str, Any]:
    raw_df = get_raw_dataframe(csv_path)

    # Filter positive transactions
    filt = (
        ~raw_df["InvoiceNo"].astype(str).str.startswith("C")
        & (raw_df["Quantity"] > 0)
        & (raw_df["UnitPrice"] > 0)
    )
    sales = raw_df[filt].copy()
    sales["revenue"] = sales["Quantity"] * sales["UnitPrice"]

    freq_rule = frequency.upper()
    freq_names = {"D": "Daily", "W": "Weekly", "M": "Monthly"}
    freq_name = freq_names.get(freq_rule, "Weekly")

    ts = (
        sales.set_index("InvoiceDate")
        .resample(freq_rule)
        .agg(
            revenue=("revenue", "sum"),
            invoices=("InvoiceNo", "nunique"),
            quantity=("Quantity", "sum")
        )
    )

    # Drop partial edges if weekly/monthly
    if len(ts) > 6:
        ts = ts.iloc[1:-1]

    ts = ts.asfreq(freq_rule, fill_value=0.0)

    # Rolling statistics
    window_size = 4 if len(ts) >= 12 else 2
    ts["rolling_mean"] = ts["revenue"].rolling(window=window_size).mean()
    ts["rolling_std"] = ts["revenue"].rolling(window=window_size).std()

    # Train / Test split
    horizon = min(forecast_horizon, max(1, len(ts) // 4))
    train = ts.iloc[:-horizon]
    test = ts.iloc[-horizon:]

    # Linear trend slope
    t_train = np.arange(len(train))
    slope, intercept = np.polyfit(t_train, train["revenue"].values, 1)

    # Models on test set
    fc_naive = np.repeat(train["revenue"].iloc[-1], horizon)
    fc_ma = np.repeat(train["revenue"].iloc[-window_size:].mean(), horizon)
    fc_trend = intercept + slope * np.arange(len(train), len(train) + horizon)

    actuals = test["revenue"].values

    def get_metrics(preds):
        err = actuals - preds
        mae = float(np.mean(np.abs(err)))
        rmse = float(np.sqrt(np.mean(err ** 2)))
        # Safe MAPE avoiding div by zero
        non_zero = actuals > 0
        mape = float(np.mean(np.abs(err[non_zero] / actuals[non_zero])) * 100) if np.any(non_zero) else 0.0
        return {"MAE": round(mae, 2), "RMSE": round(rmse, 2), "MAPE": round(mape, 2)}

    metrics = {
        "Naive (Last Value)": get_metrics(fc_naive),
        f"Moving Average ({window_size}-period)": get_metrics(fc_ma),
        "Linear Trend": get_metrics(fc_trend),
    }

    # Historical series
    hist_series = [
        {
            "date": d.strftime("%Y-%m-%d"),
            "revenue": round(float(r), 2),
            "invoices": int(inv),
            "quantity": int(qty),
            "rolling_mean": round(float(rm), 2) if not np.isnan(rm) else None,
        }
        for d, r, inv, qty, rm in zip(
            ts.index, ts["revenue"], ts["invoices"], ts["quantity"], ts["rolling_mean"]
        )
    ]

    # Forecast series combining actuals with model forecasts
    fc_series = []
    for i, test_date in enumerate(test.index):
        fc_series.append({
            "date": test_date.strftime("%Y-%m-%d"),
            "actual": round(float(actuals[i]), 2),
            "naive": round(float(fc_naive[i]), 2),
            "moving_average": round(float(fc_ma[i]), 2),
            "linear_trend": round(float(fc_trend[i]), 2),
        })

    rolling_stats = [
        {
            "date": d.strftime("%Y-%m-%d"),
            "rolling_mean": round(float(rm), 2) if not np.isnan(rm) else None,
            "rolling_std": round(float(rs), 2) if not np.isnan(rs) else None,
        }
        for d, rm, rs in zip(ts.index, ts["rolling_mean"], ts["rolling_std"])
    ]

    return {
        "frequency_name": freq_name,
        "data_points": len(ts),
        "start_date": ts.index[0].strftime("%Y-%m-%d"),
        "end_date": ts.index[-1].strftime("%Y-%m-%d"),
        "historical_series": hist_series,
        "forecast_series": fc_series,
        "metrics": metrics,
        "trend_slope_per_period": round(float(slope), 2),
        "rolling_stats": rolling_stats,
    }
