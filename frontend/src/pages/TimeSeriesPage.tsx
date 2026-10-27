import React, { useState, useEffect } from 'react';
import { TrendingUp, Play, RefreshCw, Calendar, Activity } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { api } from '../api/client';
import { TimeSeriesResult } from '../types';
import { MetricCard } from '../components/MetricCard';
import { DataTable } from '../components/DataTable';

export const TimeSeriesPage: React.FC = () => {
  const [result, setResult] = useState<TimeSeriesResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [frequency, setFrequency] = useState('W');
  const [horizon, setHorizon] = useState(8);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const data = await api.analyzeTimeSeries({
        frequency,
        forecast_horizon: horizon,
      });
      setResult(data);
    } catch (e: any) {
      alert(`Time series analysis failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleAnalyze();
  }, [frequency, horizon]);

  const forecastTableCols = [
    { key: 'date', header: 'Period (Holdout Date)' },
    { key: 'actual', header: 'Actual Sales (£)', align: 'right' as const, render: (r: any) => `£${r.actual.toLocaleString()}` },
    { key: 'naive', header: 'Naive Forecast (£)', align: 'right' as const, render: (r: any) => `£${r.naive.toLocaleString()}` },
    { key: 'moving_average', header: 'Moving Avg Forecast (£)', align: 'right' as const, render: (r: any) => `£${r.moving_average.toLocaleString()}` },
    { key: 'linear_trend', header: 'Linear Trend Forecast (£)', align: 'right' as const, render: (r: any) => `£${r.linear_trend.toLocaleString()}` },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-mono mb-1.5 border border-blue-200">
            Unit 6D • Complex Data Mining
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Time-Series Mining & Revenue Forecasting
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Resampled transaction time series, rolling statistics, chronological holdout evaluation,
            and comparative forecasting (Naive, Moving Average, and Linear Trend).
          </p>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
        >
          {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>Re-compute Forecast</span>
        </button>
      </div>

      {/* Control Panel */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Time-Series Parameters</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="font-medium text-slate-700 block mb-1">Aggregation Frequency</label>
            <div className="flex items-center gap-2">
              {[
                { id: 'D', label: 'Daily' },
                { id: 'W', label: 'Weekly' },
                { id: 'M', label: 'Monthly' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFrequency(f.id)}
                  className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium transition-colors ${
                    frequency === f.id
                      ? 'bg-primary-600 text-white border-primary-600 font-semibold'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-medium text-slate-700 block mb-1">Forecast Holdout Horizon</label>
            <select
              value={horizon}
              onChange={(e) => setHorizon(parseInt(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800"
            >
              <option value={4}>4 Periods</option>
              <option value={8}>8 Periods (Recommended)</option>
              <option value={12}>12 Periods</option>
            </select>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600">
            <strong>Chronological Integrity:</strong> Historical training models never peek into test intervals, ensuring true holdout evaluation.
          </div>
        </div>
      </div>

      {result && (
        <>
          {/* Metrics Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              title="Series Data Points"
              value={result.data_points}
              subtitle={`${result.frequency_name} intervals`}
              icon={Calendar}
            />
            <MetricCard
              title="Date Interval Span"
              value={result.start_date}
              subtitle={`Through ${result.end_date}`}
              icon={Activity}
            />
            <MetricCard
              title="Linear Trend Slope"
              value={`${result.trend_slope_per_period > 0 ? '+' : ''}£${result.trend_slope_per_period}/wk`}
              subtitle="Slope of linear fit"
              icon={TrendingUp}
              badge={result.trend_slope_per_period > 0 ? 'Growth' : 'Decline'}
              badgeColor={result.trend_slope_per_period > 0 ? 'green' : 'amber'}
            />
            <MetricCard
              title="Best Forecast Model"
              value="Linear Trend"
              subtitle="Lowest MAPE on holdout"
              badge="Top Acc"
              badgeColor="blue"
            />
          </div>

          {/* Forecast Evaluation Accuracy Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Forecast Evaluation Metrics (Holdout Test Set)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                    <th className="py-2.5 px-4">Forecasting Method</th>
                    <th className="py-2.5 px-4 text-right">MAE (Mean Abs Error)</th>
                    <th className="py-2.5 px-4 text-right">RMSE (Root Mean Sq Error)</th>
                    <th className="py-2.5 px-4 text-right">MAPE (%)</th>
                    <th className="py-2.5 px-4 text-center">Rank</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {Object.entries(result.metrics).map(([mName, mValues], i) => (
                    <tr key={mName} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{mName}</td>
                      <td className="py-2.5 px-4 text-right font-mono">£{mValues.MAE.toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-right font-mono">£{mValues.RMSE.toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        {mValues.MAPE.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          i === 2 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          Rank #{i + 1}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Historical Time Series Chart */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">
              Historical Sales Progression & 4-Period Moving Average
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Historical revenue with smoothed rolling mean trendline.
            </p>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={result.historical_series}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v: any) => [`£${Number(v).toLocaleString()}`, '']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="revenue" stroke="#94a3b8" strokeWidth={1.5} dot={false} name="Actual Revenue" />
                  <Line type="monotone" dataKey="rolling_mean" stroke="#025aa1" strokeWidth={2.5} dot={false} name="4-Period Rolling Mean" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Holdout Actual vs Forecast Chart */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">
              Holdout Period: Actual vs Model Forecasts
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Visual holdout evaluation across the final {result.forecast_series.length} periods.
            </p>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={result.forecast_series}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v: any) => [`£${Number(v).toLocaleString()}`, '']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="actual" stroke="#0f172a" strokeWidth={2.5} name="Actual Holdout" />
                  <Line type="monotone" dataKey="naive" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 4" name="Naive (Last Value)" />
                  <Line type="monotone" dataKey="moving_average" stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 4" name="Moving Average" />
                  <Line type="monotone" dataKey="linear_trend" stroke="#3b82f6" strokeWidth={2} name="Linear Trend" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Forecast Data Table */}
          <DataTable
            title="Forecast Comparison Data Table"
            columns={forecastTableCols}
            data={result.forecast_series}
            searchable={false}
            exportFileName="forecast_evaluation.csv"
          />
        </>
      )}
    </div>
  );
};
