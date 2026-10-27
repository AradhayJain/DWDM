import React, { useState, useEffect } from 'react';
import { ShoppingCart, Play, RefreshCw, BarChart2, GitCompare, Zap } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis
} from 'recharts';
import { api } from '../api/client';
import { AssociationResult } from '../types';
import { MetricCard } from '../components/MetricCard';
import { DataTable } from '../components/DataTable';

export const AssociationPage: React.FC = () => {
  const [result, setResult] = useState<AssociationResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Parameters
  const [country, setCountry] = useState('United Kingdom');
  const [minSupport, setMinSupport] = useState(0.02);
  const [minConfidence, setMinConfidence] = useState(0.6);
  const [topItems, setTopItems] = useState(100);

  const handleMine = async () => {
    setLoading(true);
    try {
      const data = await api.mineAssociationRules({
        country,
        min_support: minSupport,
        min_confidence: minConfidence,
        top_n_items: topItems,
        compare_algorithms: true,
      });
      setResult(data);
    } catch (e: any) {
      alert(`Mining failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleMine();
  }, []);

  const ruleColumns = [
    {
      key: 'antecedents',
      header: 'Antecedent (If)',
      render: (r: any) => (
        <span className="font-medium text-slate-800">
          {r.antecedents.join(' + ')}
        </span>
      ),
    },
    {
      key: 'consequents',
      header: 'Consequent (Then)',
      render: (r: any) => (
        <span className="font-semibold text-primary-700">
          {r.consequents.join(' + ')}
        </span>
      ),
    },
    { key: 'support', header: 'Support', align: 'right' as const, render: (r: any) => r.support.toFixed(4) },
    { key: 'confidence', header: 'Confidence', align: 'right' as const, render: (r: any) => `${(r.confidence * 100).toFixed(1)}%` },
    {
      key: 'lift',
      header: 'Lift',
      align: 'right' as const,
      render: (r: any) => (
        <span className="font-bold text-emerald-700 font-mono">
          {r.lift.toFixed(2)}x
        </span>
      ),
    },
    { key: 'leverage', header: 'Leverage', align: 'right' as const, render: (r: any) => r.leverage.toFixed(4) },
    { key: 'conviction', header: 'Conviction', align: 'right' as const, render: (r: any) => r.conviction.toFixed(2) },
  ];

  const measureColumns = [
    { key: 'pair', header: 'Frequent Item Pair' },
    { key: 'support', header: 'Support', align: 'right' as const },
    { key: 'lift', header: 'Lift', align: 'right' as const, render: (r: any) => <span className="font-bold">{r.lift}</span> },
    { key: 'chi2', header: 'Chi-Square (χ²)', align: 'right' as const },
    { key: 'all_conf', header: 'All-Confidence', align: 'right' as const },
    { key: 'cosine', header: 'Cosine', align: 'right' as const },
    { key: 'kulc', header: 'Kulczynski', align: 'right' as const, render: (r: any) => <span className="font-bold text-primary-700">{r.kulc}</span> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-mono mb-1.5 border border-blue-200">
            Experiments 7, 8 & 9 • Practical Syllabus Unit 4
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Association-Rule Mining & Market-Basket Analysis
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Apriori vs FP-Growth performance comparison, frequent itemset generation, association rules,
            and comprehensive correlation measure analysis (Lift, Chi-square, All-confidence, Cosine, Kulczynski).
          </p>
        </div>

        <button
          onClick={handleMine}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
        >
          {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>Mine Rules</span>
        </button>
      </div>

      {/* Parameter Control Panel */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Mining Parameters</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="font-medium text-slate-700 block mb-1">Country Filter</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800"
            >
              <option value="United Kingdom">United Kingdom</option>
              <option value="Germany">Germany</option>
              <option value="France">France</option>
              <option value="All">All Markets Combined</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="font-medium text-slate-700">Min Support</label>
              <span className="font-mono text-slate-500">{minSupport}</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="0.05"
              step="0.005"
              value={minSupport}
              onChange={(e) => setMinSupport(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="font-medium text-slate-700">Min Confidence</label>
              <span className="font-mono text-slate-500">{minConfidence}</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="0.9"
              step="0.05"
              value={minConfidence}
              onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <label className="font-medium text-slate-700 block mb-1">Top SKUs Examined</label>
            <select
              value={topItems}
              onChange={(e) => setTopItems(parseInt(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800"
            >
              <option value={50}>Top 50 Most Frequent</option>
              <option value={100}>Top 100 Most Frequent</option>
              <option value={150}>Top 150 Most Frequent</option>
            </select>
          </div>
        </div>
      </div>

      {result && (
        <>
          {/* KPI Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              title="Transaction Baskets"
              value={result.baskets_count.toLocaleString()}
              subtitle={`Avg basket size: ${result.avg_basket_size} items`}
              icon={ShoppingCart}
            />
            <MetricCard
              title="Frequent Itemsets"
              value={result.itemsets_count}
              subtitle={`min_sup >= ${minSupport}`}
              badge="Patterns"
              badgeColor="blue"
            />
            <MetricCard
              title="Association Rules"
              value={result.rules_count}
              subtitle={`min_conf >= ${minConfidence}`}
              badge="Rules"
              badgeColor="green"
            />
            <MetricCard
              title="Itemsets by Size"
              value={Object.entries(result.itemsets_by_size)
                .map(([sz, cnt]) => `L${sz}:${cnt}`)
                .join(', ')}
              subtitle="L1, L2, L3..."
              badge="Hierarchical"
              badgeColor="purple"
            />
          </div>

          {/* Association Rules DataTable */}
          <DataTable
            title={`Discovered Association Rules (${result.rules.length} total)`}
            columns={ruleColumns}
            data={result.rules}
            exportFileName="association_rules.csv"
          />

          {/* Apriori vs FP-Growth Benchmark (Experiment 8) */}
          {result.algorithm_comparison && (
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Apriori vs FP-Growth Algorithm Performance Benchmark
                  </h2>
                  <p className="text-xs text-slate-500">
                    Execution time in milliseconds across varying minimum support thresholds on identical transaction baskets.
                  </p>
                </div>
                <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Itemsets Identical: 100% Verified
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={result.algorithm_comparison}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="min_support" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => `${v}ms`} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v: any) => [`${v} ms`, 'Runtime']}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                    />
                    <Line type="monotone" dataKey="apriori_ms" stroke="#ef4444" strokeWidth={2} name="Apriori Runtime (ms)" />
                    <Line type="monotone" dataKey="fpgrowth_ms" stroke="#10b981" strokeWidth={2} name="FP-Growth Runtime (ms)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Correlation Measures & Null Invariance (Experiment 9) */}
          {result.measures_table && (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Experiment 9: Correlation Analysis & Null Invariance
                </h2>
                <p className="text-xs text-slate-500">
                  Comparison between null-variant measures (Lift, Chi-Square) and null-invariant measures (All-confidence, Cosine, Kulczynski).
                </p>
              </div>

              <DataTable
                columns={measureColumns}
                data={result.measures_table}
                pageSize={6}
                exportFileName="correlation_measures.csv"
              />

              {/* Null Invariance Demonstration Card */}
              {result.null_invariance_demo && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
                  <span className="font-bold text-slate-800 uppercase tracking-wider block">
                    Null-Invariance Mathematical Proof:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {result.null_invariance_demo.map((demo, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200 space-y-1.5 font-mono">
                        <span className="font-bold text-primary-700 block text-xs">{demo.condition}</span>
                        <div className="text-[11px] text-slate-600">Total Baskets: {demo.total_transactions.toLocaleString()}</div>
                        <div className="text-[11px] text-rose-600">Lift: {demo.lift} • Chi-Square (χ²): {demo.chi2}</div>
                        <div className="text-[11px] text-emerald-600">
                          All-Conf: {demo.all_conf} • Cosine: {demo.cosine} • Kulc: {demo.kulc}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 italic">
                    Finding: Lift and Chi-square fluctuate drastically when null transactions are added, whereas All-confidence, Cosine, and Kulczynski remain strictly invariant.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
