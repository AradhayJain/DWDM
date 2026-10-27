import React, { useState, useEffect } from 'react';
import {
  DollarSign, ShoppingCart, Users, Package, Globe,
  AlertOctagon, CheckCircle, Play, RefreshCw, ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { api } from '../api/client';
import { OverviewMetrics, PipelineStatus } from '../types';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';

export const OverviewPage: React.FC = () => {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningStage, setRunningStage] = useState<number | null>(null);

  const loadData = async () => {
    try {
      const [m, p] = await Promise.all([
        api.getOverview(),
        api.getPipelineStatus(),
      ]);
      setMetrics(m);
      setPipeline(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleRunStage = async (stageId: number) => {
    try {
      setRunningStage(stageId);
      await api.runStage(stageId);
      await loadData();
    } catch (e: any) {
      alert(`Stage ${stageId} failed: ${e.message}`);
    } finally {
      setRunningStage(null);
    }
  };

  if (loading && !metrics) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600 mb-3" />
        <p className="text-sm">Loading platform telemetry & computed metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xs border border-slate-700/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-500/20 border border-primary-400/30 text-primary-300 text-xs font-mono mb-2">
              DTU SE425 • Data Warehouse and Data Mining
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Retail Intelligence Lab
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              End-to-end data mining and relational OLAP platform operating on real transactional data:
              Online Retail dataset (541k transactions), SQLite Star/Snowflake schemas, Apriori, Decision Trees,
              RFM customer clustering, and Unit 6 complex data mining.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/pipeline"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-primary-600 hover:bg-primary-500 rounded-lg transition-colors"
            >
              <span>View Pipeline</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Net Revenue"
          value={metrics ? `£${(metrics.total_revenue / 1000000).toFixed(2)}M` : '—'}
          subtitle="Valid positive sales lines"
          icon={DollarSign}
          badge="Gross"
          badgeColor="green"
        />
        <MetricCard
          title="Total Invoices"
          value={metrics ? metrics.total_invoices.toLocaleString() : '—'}
          subtitle="Unique order numbers"
          icon={ShoppingCart}
          badge="Baskets"
          badgeColor="blue"
        />
        <MetricCard
          title="Known Customers"
          value={metrics ? metrics.known_customers.toLocaleString() : '—'}
          subtitle="Excludes guest IDs (0)"
          icon={Users}
          badge="Profiles"
          badgeColor="purple"
        />
        <MetricCard
          title="Product Catalog"
          value={metrics ? metrics.unique_products.toLocaleString() : '—'}
          subtitle="Unique StockCodes"
          icon={Package}
          badge="SKUs"
          badgeColor="slate"
        />
      </div>

      {/* Data Quality & Pipeline Metric Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase">Raw Records</span>
          <p className="text-lg font-bold text-slate-900 mt-1">
            {metrics?.raw_records.toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-400">Total lines in CSV</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase">Clean Retained</span>
          <p className="text-lg font-bold text-emerald-600 mt-1">
            {metrics?.clean_records.toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-400">Positive Quantity & Price</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase">Cancellations</span>
          <p className="text-lg font-bold text-rose-600 mt-1">
            {metrics?.cancelled_records.toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-400">InvoiceNo starting with 'C'</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase">Global Markets</span>
          <p className="text-lg font-bold text-slate-900 mt-1">
            {metrics?.countries_count}
          </p>
          <span className="text-[10px] text-slate-400">Countries represented</span>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Trend */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Monthly Revenue Trend</h2>
              <p className="text-xs text-slate-500">Historical sales progression (2010 - 2011)</p>
            </div>
            <span className="text-xs font-mono text-slate-400">In GBP (£)</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics?.revenue_trend || []}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#025aa1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#025aa1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val: any) => [`£${Number(val).toLocaleString()}`, 'Revenue']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#025aa1" strokeWidth={2} fillOpacity={1} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Countries by Revenue */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Top Revenue Markets</h2>
              <p className="text-xs text-slate-500">Highest grossing countries</p>
            </div>
            <span className="text-xs font-mono text-slate-400">Geographic Share</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics?.top_countries || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis dataKey="country" type="category" tick={{ fontSize: 11, fill: '#334155' }} width={100} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val: any) => [`£${Number(val).toLocaleString()}`, 'Revenue']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Pipeline Stages Execution Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">End-to-End Pipeline Execution Status</h2>
            <p className="text-xs text-slate-500">18 orchestrated stages connecting raw data to mining and reporting</p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Last update: {pipeline?.last_updated || '—'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                <th className="py-2.5 px-4 w-12">#</th>
                <th className="py-2.5 px-4">Stage Name</th>
                <th className="py-2.5 px-4">Syllabus / Unit</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Duration</th>
                <th className="py-2.5 px-4">Summary Finding</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {pipeline?.stages.map((st) => (
                <tr key={st.stage_id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-4 font-mono text-slate-400">{st.stage_id}</td>
                  <td className="py-2.5 px-4 font-semibold text-slate-800">{st.stage_name}</td>
                  <td className="py-2.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
                      {st.syllabus_unit}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    <StatusBadge status={st.status} size="sm" />
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-500">
                    {st.duration_sec > 0 ? `${st.duration_sec.toFixed(2)}s` : '—'}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600 max-w-xs truncate">
                    {st.summary || (st.error ? <span className="text-rose-600">{st.error}</span> : 'Ready to execute')}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      onClick={() => handleRunStage(st.stage_id)}
                      disabled={runningStage === st.stage_id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded transition-colors shadow-2xs disabled:opacity-50"
                    >
                      {runningStage === st.stage_id ? (
                        <RefreshCw className="w-3 h-3 animate-spin text-primary-600" />
                      ) : (
                        <Play className="w-3 h-3 fill-slate-500 text-slate-500" />
                      )}
                      <span>Run</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
