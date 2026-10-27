import React, { useState, useEffect } from 'react';
import { ListOrdered, Play, RefreshCw, Clock, ArrowRight, UserCheck } from 'lucide-react';
import { api } from '../api/client';
import { SequenceResult } from '../types';
import { MetricCard } from '../components/MetricCard';
import { DataTable } from '../components/DataTable';

export const SequencePage: React.FC = () => {
  const [result, setResult] = useState<SequenceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [minPurchases, setMinPurchases] = useState(2);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const data = await api.analyzeSequences({
        min_purchases: minPurchases,
        top_n_patterns: 15,
      });
      setResult(data);
    } catch (e: any) {
      alert(`Sequence analysis failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleAnalyze();
  }, [minPurchases]);

  const transitionColumns = [
    { key: 'from_item', header: 'First Purchase (t)' },
    { key: 'to_item', header: 'Subsequent Purchase (t+1)' },
    { key: 'frequency', header: 'Observed Frequency', align: 'right' as const },
    {
      key: 'transition_probability',
      header: 'Transition Share',
      align: 'right' as const,
      render: (r: any) => `${r.transition_probability}%`,
    },
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
            Transaction Sequence Mining & Customer Journeys
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Chronological transaction timeline extraction, inter-purchase cycle analysis,
            and sequential item transition patterns (Item at step t &rarr; Item at step t+1).
          </p>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
        >
          {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>Mine Sequences</span>
        </button>
      </div>

      {/* Control Panel */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">Sequence Parameters</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="font-medium text-slate-700 block mb-1">Minimum Customer Invoices</label>
            <select
              value={minPurchases}
              onChange={(e) => setMinPurchases(parseInt(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800"
            >
              <option value={2}>At least 2 Purchases (Repeat Customers)</option>
              <option value={3}>At least 3 Purchases</option>
              <option value={5}>At least 5 Purchases (Frequent Buyers)</option>
            </select>
          </div>

          <div className="sm:col-span-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600">
            <strong>Sequence Mining Distinction:</strong> Unlike standard association rules that treat items as unordered sets within a single basket, sequence mining models ordered transitions across successive temporal transactions.
          </div>
        </div>
      </div>

      {result && (
        <>
          {/* Metrics Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              title="Repeat Customers"
              value={result.eligible_customers.toLocaleString()}
              subtitle={`Repeat rate: ${result.repeat_purchase_rate}%`}
              icon={UserCheck}
              badge="Cohorts"
              badgeColor="green"
            />
            <MetricCard
              title="Total Sequences"
              value={result.total_sequences.toLocaleString()}
              subtitle={`Avg sequence length: ${result.avg_sequence_length}`}
              icon={ListOrdered}
            />
            <MetricCard
              title="Mean Purchase Cycle"
              value={`${result.interval_stats.mean_days} Days`}
              subtitle={`Median: ${result.interval_stats.median_days} days`}
              icon={Clock}
              badge="Repurchase"
              badgeColor="blue"
            />
            <MetricCard
              title="Cycle Std Dev"
              value={`${result.interval_stats.std_days} Days`}
              subtitle="Interval dispersion"
              badge="Variance"
              badgeColor="slate"
            />
          </div>

          {/* Sequential Item Transitions Table */}
          <DataTable
            title="Frequent Consecutive Product Transitions"
            columns={transitionColumns}
            data={result.frequent_transitions}
            exportFileName="sequential_item_transitions.csv"
          />

          {/* Sample Customer Journey Timelines */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Representative Customer Purchase Journey Timelines
              </h2>
              <p className="text-xs text-slate-500">
                Sequential progression of transactions for sample repeat buyers.
              </p>
            </div>

            <div className="space-y-4">
              {result.sample_customer_journeys.map((j) => (
                <div key={j.customer_id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">Customer #{j.customer_id}</span>
                    <span className="font-mono text-slate-500">{j.total_invoices} total transactions recorded</span>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {j.steps.map((st, idx) => (
                      <React.Fragment key={st.step}>
                        <div className="min-w-44 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-primary-700">Step {st.step}</span>
                            <span className="font-mono text-slate-400">{st.date}</span>
                          </div>
                          <div className="text-xs font-semibold text-slate-800">
                            {st.item_count} items in basket
                          </div>
                          <div className="text-[10px] text-slate-500 line-clamp-1 italic">
                            {st.sample_items.join(', ')}
                          </div>
                        </div>
                        {idx < j.steps.length - 1 && (
                          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
