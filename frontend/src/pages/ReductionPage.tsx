import React, { useState, useEffect } from 'react';
import { Scissors, Play, RefreshCw, BarChart2, Layers } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { api } from '../api/client';
import { ReductionResult } from '../types';
import { MetricCard } from '../components/MetricCard';

export const ReductionPage: React.FC = () => {
  const [result, setResult] = useState<ReductionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [cutoffDate, setCutoffDate] = useState('2011-09-01');

  const handleRun = async () => {
    setLoading(true);
    try {
      const data = await api.runReduction({
        cutoff_date: cutoffDate,
        discretization_bins: 4,
        n_pca_components: 2,
        rfe_features: 4,
      });
      setResult(data);
    } catch (e: any) {
      alert(`Reduction failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleRun();
  }, []);

  const pcaChartData = result?.pca_explained_variance.map((ev, i) => ({
    comp: `PC${i + 1}`,
    variance: Number((ev * 100).toFixed(1)),
    cumulative: Number(((result.pca_cumulative_variance[i] || 0) * 100).toFixed(1)),
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-mono mb-1.5 border border-blue-200">
            Experiment 3 • Practical Syllabus Unit 2
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Data Reduction & Discretization Lab
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Supervised feature selection via Mutual Information and RFE, Principal Component Analysis (PCA),
            equal-width vs equal-frequency discretization, and concept hierarchy modeling.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={cutoffDate}
            onChange={(e) => setCutoffDate(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700"
            title="Chronological Cutoff Date"
          />
          <button
            onClick={handleRun}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>Compute Reduction</span>
          </button>
        </div>
      </div>

      {result && (
        <>
          {/* Top KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              title="Customers Profiled"
              value={result.customer_count.toLocaleString()}
              subtitle="Aggregated before cutoff"
              icon={Scissors}
            />
            <MetricCard
              title="Customer Attributes"
              value={result.attribute_count}
              subtitle="Constructed features"
              icon={Layers}
            />
            <MetricCard
              title="PCA 90% Variance"
              value={`${result.pca_90_variance_components} of ${result.attribute_count}`}
              subtitle="Components needed"
              badge="Compression"
              badgeColor="purple"
            />
            <MetricCard
              title="Class Balance"
              value={`${result.class_balance['1'] || 0} / ${result.class_balance['0'] || 0}`}
              subtitle="Active (1) vs Lapsed (0)"
              badge="Target"
              badgeColor="blue"
            />
          </div>

          {/* Feature Selection: Mutual Information & RFE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <h2 className="text-sm font-semibold text-slate-900 mb-1">
                Mutual Information Feature Ranking (Information Gain)
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Non-linear dependency scores between customer features and future purchase (active_next).
              </p>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={result.mutual_info_scores} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="feature" type="category" tick={{ fontSize: 11, fill: '#334155' }} width={100} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v: any) => [Number(v).toFixed(4), 'Info Gain (bits)']}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                    />
                    <Bar dataKey="importance" fill="#025aa1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 mb-1">
                  RFE & Multicollinearity Analysis
                </h2>
                <p className="text-xs text-slate-500 mb-4">
                  Backward elimination selection and redundant feature detection (|r| &gt; 0.8).
                </p>

                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Top 4 Attributes by RFE (Logistic Regression):
                    </span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {result.rfe_selected_features.map((f) => (
                        <span key={f} className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-mono font-medium border border-blue-200">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Highly Correlated (Redundant) Pairs:
                    </span>
                    <div className="mt-2 space-y-1.5">
                      {result.redundant_pairs.map((p, idx) => (
                        <div key={idx} className="p-2.5 bg-amber-50/60 rounded-lg border border-amber-200 text-xs flex items-center justify-between text-amber-900">
                          <span>
                            <strong>{p.feature_1}</strong> &harr; <strong>{p.feature_2}</strong>
                          </span>
                          <span className="font-mono font-semibold">r = {p.correlation}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 mt-4">
                <strong>Methodology Note:</strong> Target feature <code>active_next</code> is derived solely from transactions occurring <em>after</em> the cutoff date, preventing chronological leakage.
              </div>
            </div>
          </div>

          {/* PCA Scree & Cumulative Variance */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">
              Principal Component Analysis (PCA on Standardized Features)
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Individual and cumulative explained variance. {result.pca_90_variance_components} components preserve &gt;90% of the dataset variance.
            </p>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pcaChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="comp" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v: any) => [`${v}%`, 'Variance']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  />
                  <Line type="monotone" dataKey="variance" stroke="#025aa1" strokeWidth={2} name="Individual %" />
                  <Line type="monotone" dataKey="cumulative" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" name="Cumulative %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Discretization Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <h2 className="text-sm font-semibold text-slate-900 mb-1">
                Equal-Width Binning (Monetary Value)
              </h2>
              <p className="text-xs text-slate-500 mb-3">Uniform range interval partitioning</p>
              <div className="space-y-2 text-xs">
                {result.discretization_equal_width.counts.map((cnt, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                    <span className="font-mono text-slate-600">
                      Bin {i + 1}: £{result.discretization_equal_width.edges[i]?.toLocaleString()} - £{result.discretization_equal_width.edges[i + 1]?.toLocaleString()}
                    </span>
                    <span className="font-bold text-slate-900">{cnt} customers</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <h2 className="text-sm font-semibold text-slate-900 mb-1">
                Equal-Frequency Binning (Quantiles)
              </h2>
              <p className="text-xs text-slate-500 mb-3">Quantile-based equal customer distribution</p>
              <div className="space-y-2 text-xs">
                {result.discretization_equal_freq.counts.map((cnt, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                    <span className="font-mono text-slate-600">
                      Quartile {i + 1}: £{result.discretization_equal_freq.edges[i]?.toLocaleString()} - £{result.discretization_equal_freq.edges[i + 1]?.toLocaleString()}
                    </span>
                    <span className="font-bold text-emerald-700">{cnt} customers</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
