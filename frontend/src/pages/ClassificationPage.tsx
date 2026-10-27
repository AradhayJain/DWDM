import React, { useState, useEffect } from 'react';
import { GitMerge, Play, RefreshCw, Award, Code, CheckCircle2 } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { api } from '../api/client';
import { ClassificationResult } from '../types';
import { MetricCard } from '../components/MetricCard';

export const ClassificationPage: React.FC = () => {
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Parameters
  const [algorithm, setAlgorithm] = useState('All');
  const [criterion, setCriterion] = useState<'entropy' | 'gini'>('entropy');
  const [ccpAlpha, setCcpAlpha] = useState(0.005);
  const [knnNeighbors, setKnnNeighbors] = useState(7);

  const handleTrain = async () => {
    setLoading(true);
    try {
      const data = await api.trainClassification({
        cutoff_date: '2011-09-01',
        algorithm,
        tree_criterion: criterion,
        ccp_alpha: ccpAlpha,
        knn_neighbors: knnNeighbors,
      });
      setResult(data);
    } catch (e: any) {
      alert(`Classification training failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleTrain();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-mono mb-1.5 border border-blue-200">
            Experiments 10 & 11 • Practical Syllabus Unit 5
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Classification & Supervised Predictive Modeling
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Predict future customer churn/repeat purchase using Decision Trees (entropy/gini with pruning),
            Gaussian Naive Bayes, and K-Nearest Neighbors (kNN) evaluated via 10-fold Stratified Cross-Validation.
          </p>
        </div>

        <button
          onClick={handleTrain}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
        >
          {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>Train Models</span>
        </button>
      </div>

      {/* Control Panel */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Model Parameters</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="font-medium text-slate-700 block mb-1">Tree Splitting Criterion</label>
            <select
              value={criterion}
              onChange={(e) => setCriterion(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800"
            >
              <option value="entropy">Entropy (Information Gain)</option>
              <option value="gini">Gini Impurity</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="font-medium text-slate-700">Cost-Complexity Pruning (α)</label>
              <span className="font-mono text-slate-500">{ccpAlpha}</span>
            </div>
            <input
              type="range"
              min="0.001"
              max="0.02"
              step="0.001"
              value={ccpAlpha}
              onChange={(e) => setCcpAlpha(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <label className="font-medium text-slate-700 block mb-1">kNN Neighbors (k)</label>
            <select
              value={knnNeighbors}
              onChange={(e) => setKnnNeighbors(parseInt(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800"
            >
              {[3, 5, 7, 9, 11, 15, 21].map((k) => (
                <option key={k} value={k}>k = {k} neighbors</option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600">
            <strong>Target:</strong> Repeat purchase (active_next). Feature window strictly pre-cutoff (2011-09-01) to prevent target leakage.
          </div>
        </div>
      </div>

      {result && (
        <>
          {/* Top KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              title="Best Performing Model"
              value={result.best_model_name}
              subtitle="By 10-fold CV Accuracy"
              icon={Award}
              badge="Top Rank"
              badgeColor="green"
            />
            <MetricCard
              title="Majority Baseline"
              value={`${(result.majority_baseline * 100).toFixed(1)}%`}
              subtitle="Zero-rule majority classifier"
              badge="Benchmark"
              badgeColor="slate"
            />
            <MetricCard
              title="Class Entropy"
              value={`${result.entropy_class.toFixed(3)} bits`}
              subtitle="Uncertainty of active_next"
              badge="Information"
              badgeColor="purple"
            />
            <MetricCard
              title="Customer Cohort"
              value={result.customer_counts.total.toLocaleString()}
              subtitle={`${result.customer_counts.active_1} active / ${result.customer_counts.lapsed_0} lapsed`}
              badge="Dataset"
              badgeColor="blue"
            />
          </div>

          {/* Model Comparison Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Model Comparison Table (10-Fold Stratified Cross-Validation)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                    <th className="py-2.5 px-4">Classifier Model</th>
                    <th className="py-2.5 px-4 text-right">Holdout Accuracy</th>
                    <th className="py-2.5 px-4 text-right">Precision</th>
                    <th className="py-2.5 px-4 text-right">Recall</th>
                    <th className="py-2.5 px-4 text-right">F1-Score</th>
                    <th className="py-2.5 px-4 text-right">ROC AUC</th>
                    <th className="py-2.5 px-4 text-right">10-Fold CV Acc</th>
                    <th className="py-2.5 px-4 text-center">Beats Baseline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {result.model_results.map((m) => {
                    const isBest = m.model_name === result.best_model_name;
                    return (
                      <tr key={m.model_name} className={`hover:bg-slate-50 transition-colors ${isBest ? 'bg-emerald-50/30' : ''}`}>
                        <td className="py-2.5 px-4 font-semibold text-slate-900 flex items-center gap-2">
                          {isBest && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                          {m.model_name}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono">{(m.accuracy * 100).toFixed(1)}%</td>
                        <td className="py-2.5 px-4 text-right font-mono">{(m.precision * 100).toFixed(1)}%</td>
                        <td className="py-2.5 px-4 text-right font-mono">{(m.recall * 100).toFixed(1)}%</td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold">{m.f1_score.toFixed(3)}</td>
                        <td className="py-2.5 px-4 text-right font-mono">{m.auc.toFixed(3)}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                          {(m.cv_accuracy_mean * 100).toFixed(1)}% &plusmn; {(m.cv_accuracy_std * 100).toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            YES (+{((m.cv_accuracy_mean - result.majority_baseline) * 100).toFixed(1)}%)
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Decision Tree Rules & Feature Importance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {result.feature_importances && (
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
                <h2 className="text-sm font-semibold text-slate-900 mb-1">
                  Decision Tree Feature Importances
                </h2>
                <p className="text-xs text-slate-500 mb-4">
                  Gini / Entropy reduction contributed by each customer attribute.
                </p>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={result.feature_importances} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="feature" type="category" tick={{ fontSize: 11, fill: '#334155' }} width={100} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(v: any) => [Number(v).toFixed(3), 'Importance']}
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                      />
                      <Bar dataKey="importance" fill="#025aa1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {result.tree_rules_text && (
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col">
                <h2 className="text-sm font-semibold text-slate-900 mb-1 flex items-center gap-1.5">
                  <Code className="w-4 h-4 text-primary-600" />
                  Pruned Decision Tree Rules Export
                </h2>
                <p className="text-xs text-slate-500 mb-3">
                  Extracted if-then classification rules (first three depth levels)
                </p>

                <div className="bg-slate-900 rounded-lg p-3 text-slate-300 font-mono text-[11px] overflow-y-auto flex-1 max-h-64 border border-slate-800 leading-relaxed">
                  <pre>{result.tree_rules_text}</pre>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
