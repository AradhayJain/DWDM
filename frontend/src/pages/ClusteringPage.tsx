import React, { useState, useEffect } from 'react';
import { UserCheck, Play, RefreshCw, BarChart2, AlertCircle } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis
} from 'recharts';
import { api } from '../api/client';
import { ClusteringResult } from '../types';
import { MetricCard } from '../components/MetricCard';
import { DataTable } from '../components/DataTable';

export const ClusteringPage: React.FC = () => {
  const [result, setResult] = useState<ClusteringResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Parameters
  const [nClusters, setNClusters] = useState(4);
  const [dbscanEps, setDbscanEps] = useState(0.45);
  const [dbscanMinPts, setDbscanMinPts] = useState(10);

  const handleRun = async () => {
    setLoading(true);
    try {
      const data = await api.runClustering({
        cutoff_date: '2011-09-01',
        n_clusters: nClusters,
        dbscan_eps: dbscanEps,
        dbscan_min_samples: dbscanMinPts,
      });
      setResult(data);
    } catch (e: any) {
      alert(`Clustering failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleRun();
  }, []);

  const profileCols = [
    { key: 'cluster_id', header: 'ID', align: 'center' as const },
    { key: 'segment_name', header: 'Segment Name', render: (r: any) => <span className="font-bold text-slate-900">{r.segment_name}</span> },
    { key: 'customer_count', header: 'Customers', align: 'right' as const, render: (r: any) => r.customer_count.toLocaleString() },
    { key: 'percentage', header: 'Share %', align: 'right' as const, render: (r: any) => `${r.percentage}%` },
    { key: 'avg_recency_days', header: 'Avg Recency (Days)', align: 'right' as const, render: (r: any) => `${r.avg_recency_days}d` },
    { key: 'avg_frequency_invoices', header: 'Avg Frequency', align: 'right' as const, render: (r: any) => `${r.avg_frequency_invoices} orders` },
    { key: 'avg_monetary_revenue', header: 'Avg Monetary Spend', align: 'right' as const, render: (r: any) => `£${r.avg_monetary_revenue.toLocaleString()}` },
  ];

  const outlierCols = [
    { key: 'customer_id', header: 'Customer ID', align: 'center' as const },
    { key: 'recency', header: 'Recency (Days)', align: 'right' as const },
    { key: 'frequency', header: 'Frequency', align: 'right' as const },
    { key: 'monetary', header: 'Monetary Spend (£)', align: 'right' as const, render: (r: any) => `£${r.monetary.toLocaleString()}` },
    { key: 'reason', header: 'Detection Reason', render: (r: any) => <span className="text-amber-700 font-medium">{r.reason}</span> },
  ];

  const colorsByCluster: Record<number, string> = {
    0: '#025aa1',
    1: '#10b981',
    2: '#f59e0b',
    3: '#ef4444',
    4: '#8b5cf6',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-mono mb-1.5 border border-blue-200">
            Experiment 12 • Practical Syllabus Unit 5
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Customer Segmentation & Outlier Detection
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            K-Means clustering on log-scaled Recency, Frequency, Monetary (RFM) features, Elbow method,
            Silhouette score validation, Ward Hierarchical clustering, and DBSCAN density-based outlier detection.
          </p>
        </div>

        <button
          onClick={handleRun}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
        >
          {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>Run Clustering</span>
        </button>
      </div>

      {/* Control Panel */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Clustering Controls</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="font-medium text-slate-700 block mb-1">K-Means Clusters (k)</label>
            <select
              value={nClusters}
              onChange={(e) => setNClusters(parseInt(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800"
            >
              {[2, 3, 4, 5, 6, 7].map((k) => (
                <option key={k} value={k}>k = {k} clusters</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="font-medium text-slate-700">DBSCAN Epsilon (&epsilon;)</label>
              <span className="font-mono text-slate-500">{dbscanEps}</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="0.8"
              step="0.05"
              value={dbscanEps}
              onChange={(e) => setDbscanEps(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="font-medium text-slate-700">DBSCAN Min Samples</label>
              <span className="font-mono text-slate-500">{dbscanMinPts}</span>
            </div>
            <input
              type="range"
              min="5"
              max="25"
              step="1"
              value={dbscanMinPts}
              onChange={(e) => setDbscanMinPts(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {result && (
        <>
          {/* Top KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              title="Clustered Customers"
              value={result.total_customers.toLocaleString()}
              subtitle="RFM feature space"
              icon={UserCheck}
            />
            <MetricCard
              title="K-Means Silhouette"
              value={result.overall_silhouette.toFixed(3)}
              subtitle={`Optimal k by silhouette = ${result.best_k_silhouette}`}
              badge="Quality"
              badgeColor="green"
            />
            <MetricCard
              title="Hierarchical (Ward) Sil"
              value={result.hierarchical_silhouette.toFixed(3)}
              subtitle="Agglomerative cluster score"
              badge="Ward"
              badgeColor="blue"
            />
            <MetricCard
              title="DBSCAN Outliers"
              value={`${result.dbscan_noise_count} (${result.dbscan_noise_percent}%)`}
              subtitle="Density noise points"
              badge="Outliers"
              badgeColor="amber"
            />
          </div>

          {/* Validation Curves: Elbow SSE & Silhouette Score */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <h2 className="text-sm font-semibold text-slate-900 mb-1">
                Elbow Method (Sum of Squared Errors vs k)
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Look for the bend/elbow where reduction in SSE diminishes (typically k=4).
              </p>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={result.elbow_inertia}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="k" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v: any) => [Number(v).toFixed(1), 'SSE']}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                    />
                    <Line type="monotone" dataKey="sse" stroke="#025aa1" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <h2 className="text-sm font-semibold text-slate-900 mb-1">
                Silhouette Score Validation Curve
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Higher silhouette indicates better separation and cohesion between clusters.
              </p>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={result.silhouette_by_k}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="k" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v: any) => [Number(v).toFixed(4), 'Silhouette']}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                    />
                    <Line type="monotone" dataKey="silhouette" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Segment Profiles DataTable */}
          <DataTable
            title={`Customer Segments Profile (k=${result.chosen_k})`}
            columns={profileCols}
            data={result.cluster_profiles}
            searchable={false}
            exportFileName="customer_segments_rfm.csv"
          />

          {/* PCA 2D Cluster Visualization */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">
              Customer Segments Visualization (PCA of RFM Space)
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Two-dimensional projection of standardized Recency, Frequency, and Monetary attributes.
            </p>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="x" name="PC1" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="y" name="PC2" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ payload }) => {
                      if (!payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="p-3 bg-slate-900 text-white rounded-lg text-xs space-y-1 shadow-lg">
                          <p className="font-bold text-primary-300">{d.segment}</p>
                          <p>Customer #{d.customer_id}</p>
                          <p>Recency: {d.recency}d | Freq: {d.frequency} | Spend: £{d.monetary}</p>
                        </div>
                      );
                    }}
                  />
                  {result.cluster_profiles.map((cp) => {
                    const clusterPoints = result.pca_scatter.filter((p) => p.cluster === cp.cluster_id);
                    return (
                      <Scatter
                        key={cp.cluster_id}
                        name={cp.segment_name}
                        data={clusterPoints}
                        fill={colorsByCluster[cp.cluster_id % 5]}
                      />
                    );
                  })}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* DBSCAN Outlier Detection Table */}
          <DataTable
            title={`DBSCAN Detected Outliers (${result.outlier_samples.length} sample noise records)`}
            columns={outlierCols}
            data={result.outlier_samples}
            searchable={false}
            exportFileName="dbscan_outliers.csv"
          />
        </>
      )}
    </div>
  );
};
