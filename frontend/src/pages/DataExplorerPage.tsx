import React, { useState, useEffect } from 'react';
import { Database, AlertTriangle, RefreshCw, BarChart2, Hash, FileSpreadsheet } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { api } from '../api/client';
import { DatasetProfile } from '../types';
import { MetricCard } from '../components/MetricCard';
import { DataTable } from '../components/DataTable';

export const DataExplorerPage: React.FC = () => {
  const [profile, setProfile] = useState<DatasetProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await api.getDatasetProfile();
      setProfile(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600 mb-3" />
        <p className="text-sm">Profiling raw dataset and computing attribute distributions...</p>
      </div>
    );
  }

  const attributeRows = profile.columns.map((c) => ({
    attribute: c,
    type: profile.column_types[c] || 'unknown',
    kind: profile.attribute_kinds[c] || 'nominal',
    missing_count: profile.missing_values[c] || 0,
    missing_pct: `${profile.missing_percentages[c]}%`,
    unique_count: profile.unique_counts[c] || 0,
  }));

  const sampleCols = profile.columns.map((c) => ({
    key: c,
    header: c,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-mono mb-1.5 border border-blue-200">
            Experiment 1 • Practical Syllabus Unit 1
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Dataset Exploration & Attribute Profiling
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Comprehensive statistical exploration of the primary Online Retail dataset covering attribute kinds,
            missing values, distinct cardinalities, and distribution skews.
          </p>
        </div>

        <button
          onClick={fetchProfile}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Refresh Profile</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          title="Total Instances (Rows)"
          value={profile.total_rows.toLocaleString()}
          subtitle="Transactions recorded"
          icon={Database}
        />
        <MetricCard
          title="Total Attributes"
          value={profile.total_columns}
          subtitle="Columns inspected"
          icon={Hash}
        />
        <MetricCard
          title="Date Span"
          value={`${profile.date_range.start}`}
          subtitle={`Through ${profile.date_range.end}`}
          icon={FileSpreadsheet}
        />
        <MetricCard
          title="Cancelled Invoices"
          value={profile.cancelled_count.toLocaleString()}
          subtitle="InvoiceNo starts with 'C'"
          icon={AlertTriangle}
          badge="Returns"
          badgeColor="amber"
        />
      </div>

      {/* Attribute Kinds & Types Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <h2 className="text-sm font-semibold text-slate-900 mb-1">
          Attribute Schema, Types and Measurement Scales
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Data mining categorization into Nominal, Numeric (Ratio scale), and Date-time (Interval scale).
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                <th className="py-2.5 px-4">Attribute</th>
                <th className="py-2.5 px-4">Storage Type</th>
                <th className="py-2.5 px-4">Attribute Kind (Scale)</th>
                <th className="py-2.5 px-4 text-right">Missing Count</th>
                <th className="py-2.5 px-4 text-right">Missing %</th>
                <th className="py-2.5 px-4 text-right">Distinct Values</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {attributeRows.map((row) => (
                <tr key={row.attribute} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 px-4 font-semibold text-slate-900">{row.attribute}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-600">{row.type}</td>
                  <td className="py-2.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-700 border border-slate-200">
                      {row.kind}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono">
                    {row.missing_count > 0 ? (
                      <span className="text-amber-600 font-semibold">{row.missing_count.toLocaleString()}</span>
                    ) : (
                      '0'
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-500">{row.missing_pct}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-medium">{row.unique_count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Numeric Descriptive Statistics */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <h2 className="text-sm font-semibold text-slate-900 mb-1">
          Descriptive Statistics of Numeric Attributes
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Five-number summary, mean, standard deviation, and skewness for Quantity and UnitPrice.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {['Quantity', 'UnitPrice'].map((attr) => {
            const stats = profile.numeric_stats[attr] || {};
            const skew = profile.skewness[attr];
            return (
              <div key={attr} className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{attr}</span>
                  <span className="text-xs font-mono text-slate-600">
                    Skewness: <strong className="text-slate-900">{skew}</strong>
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded border border-slate-200/60">
                    <div className="text-[10px] text-slate-400">Mean</div>
                    <div className="font-semibold text-slate-800 font-mono mt-0.5">{stats.mean}</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200/60">
                    <div className="text-[10px] text-slate-400">Std Dev</div>
                    <div className="font-semibold text-slate-800 font-mono mt-0.5">{stats.std}</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200/60">
                    <div className="text-[10px] text-slate-400">Min</div>
                    <div className="font-semibold text-rose-600 font-mono mt-0.5">{stats.min}</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200/60">
                    <div className="text-[10px] text-slate-400">Max</div>
                    <div className="font-semibold text-emerald-600 font-mono mt-0.5">{stats.max}</div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded border border-slate-200/60">
                    <div className="text-[10px] text-slate-400">25% (Q1)</div>
                    <div className="font-semibold text-slate-800 font-mono mt-0.5">{stats['25%']}</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200/60">
                    <div className="text-[10px] text-slate-400">Median (Q2)</div>
                    <div className="font-semibold text-slate-800 font-mono mt-0.5">{stats['50%']}</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200/60">
                    <div className="text-[10px] text-slate-400">75% (Q3)</div>
                    <div className="font-semibold text-slate-800 font-mono mt-0.5">{stats['75%']}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Distribution Histograms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <h2 className="text-sm font-semibold text-slate-900">Histogram of log10(UnitPrice)</h2>
          <p className="text-xs text-slate-500 mb-4">Logarithmic transformation for strictly positive prices</p>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profile.histograms?.unit_price_log10 || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="bin" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val: any) => [Number(val).toLocaleString(), 'Frequency']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="count" fill="#0284c7" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <h2 className="text-sm font-semibold text-slate-900">Histogram of log10(Quantity)</h2>
          <p className="text-xs text-slate-500 mb-4">Logarithmic transformation for strictly positive purchase volumes</p>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profile.histograms?.quantity_log10 || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="bin" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val: any) => [Number(val).toLocaleString(), 'Frequency']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="count" fill="#f59e0b" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Sample Records DataTable */}
      <DataTable
        title="Raw Dataset Preview (First 20 Sample Records)"
        columns={sampleCols}
        data={profile.sample_rows}
        searchPlaceholder="Filter sample data..."
        exportFileName="online_retail_sample.csv"
      />
    </div>
  );
};
