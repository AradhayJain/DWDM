import React, { useState, useEffect } from 'react';
import { Filter, Play, RefreshCw, CheckCircle2, ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import { PreprocessingResult } from '../types';
import { MetricCard } from '../components/MetricCard';
import { DataTable } from '../components/DataTable';

export const PreprocessingPage: React.FC = () => {
  const [result, setResult] = useState<PreprocessingResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Configurable parameters
  const [imputeDesc, setImputeDesc] = useState(true);
  const [guestHandling, setGuestHandling] = useState<'zero' | 'exclude'>('zero');
  const [removeDupes, setRemoveDupes] = useState(true);
  const [removeCancels, setRemoveCancels] = useState(true);
  const [removeInvalid, setRemoveInvalid] = useState(true);

  const handleRun = async () => {
    setLoading(true);
    try {
      const data = await api.runPreprocessing({
        impute_description: imputeDesc,
        guest_customer_handling: guestHandling,
        remove_duplicates: removeDupes,
        remove_cancellations: removeCancels,
        remove_invalid_prices: removeInvalid,
        binning_feature: 'UnitPrice',
        binning_samples: 20,
        normalization_feature: 'Quantity',
      });
      setResult(data);
    } catch (e: any) {
      alert(`Preprocessing failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleRun();
  }, []);

  const smoothingColumns = [
    { key: 'index', header: '#' },
    { key: 'UnitPrice', header: 'Original UnitPrice (£)', align: 'right' as const },
    { key: 'bin', header: 'Equi-Depth Bin', align: 'center' as const },
    { key: 'bin_mean', header: 'Smoothed by Mean (£)', align: 'right' as const },
    { key: 'bin_median', header: 'Smoothed by Median (£)', align: 'right' as const },
    { key: 'bin_boundary', header: 'Smoothed by Boundaries (£)', align: 'right' as const },
  ];

  const normColumns = [
    { key: 'Quantity', header: 'Original Quantity', align: 'right' as const },
    { key: 'min_max', header: 'Min-Max [0, 1]', align: 'right' as const },
    { key: 'z_score', header: 'Z-Score Normalization', align: 'right' as const },
    { key: 'decimal', header: 'Decimal Scaling (j=5)', align: 'right' as const },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-mono mb-1.5 border border-blue-200">
            Experiment 2 • Practical Syllabus Unit 2
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Data Preprocessing, Cleaning & Normalization
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Data preparation routines: missing-value imputation, cancellation filtering, duplicate removal,
            equi-depth binning smoothing, and numeric feature normalization.
          </p>
        </div>

        <button
          onClick={handleRun}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
        >
          {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>Execute Preprocessing</span>
        </button>
      </div>

      {/* Parameter Controls Panel */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Configurable Preprocessing Parameters</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer">
            <input
              type="checkbox"
              checked={imputeDesc}
              onChange={(e) => setImputeDesc(e.target.checked)}
              className="mt-0.5 rounded text-primary-600 focus:ring-primary-500"
            />
            <div>
              <span className="font-semibold text-slate-800">Impute Descriptions</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Use modal Description grouped by StockCode</p>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer">
            <input
              type="checkbox"
              checked={removeDupes}
              onChange={(e) => setRemoveDupes(e.target.checked)}
              className="mt-0.5 rounded text-primary-600 focus:ring-primary-500"
            />
            <div>
              <span className="font-semibold text-slate-800">Drop Duplicate Records</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Eliminates identical transaction rows</p>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer">
            <input
              type="checkbox"
              checked={removeCancels}
              onChange={(e) => setRemoveCancels(e.target.checked)}
              className="mt-0.5 rounded text-primary-600 focus:ring-primary-500"
            />
            <div>
              <span className="font-semibold text-slate-800">Filter Cancelled Orders</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Removes invoices starting with 'C'</p>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer">
            <input
              type="checkbox"
              checked={removeInvalid}
              onChange={(e) => setRemoveInvalid(e.target.checked)}
              className="mt-0.5 rounded text-primary-600 focus:ring-primary-500"
            />
            <div>
              <span className="font-semibold text-slate-800">Filter Non-Positive Values</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Excludes Quantity &le; 0 and UnitPrice &le; 0</p>
            </div>
          </label>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 sm:col-span-2">
            <span className="font-semibold text-slate-800">Missing CustomerID Strategy</span>
            <div className="flex items-center gap-4 mt-1.5">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="guestHandling"
                  value="zero"
                  checked={guestHandling === 'zero'}
                  onChange={() => setGuestHandling('zero')}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="text-slate-700">Assign ID 0 (Guest Checkout)</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="guestHandling"
                  value="exclude"
                  checked={guestHandling === 'exclude'}
                  onChange={() => setGuestHandling('exclude')}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="text-slate-700">Drop Unknown Customers</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {result && (
        <>
          {/* Funnel KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              title="Original Records"
              value={result.original_count.toLocaleString()}
              subtitle="Unprocessed rows"
              icon={Filter}
            />
            <MetricCard
              title="Duplicates Removed"
              value={result.duplicates_removed.toLocaleString()}
              subtitle="Exact duplicated rows"
              badge="Cleaned"
              badgeColor="amber"
            />
            <MetricCard
              title="Returns Filtered"
              value={result.cancellations_removed.toLocaleString()}
              subtitle="Cancelled invoice codes"
              badge="Returns"
              badgeColor="slate"
            />
            <MetricCard
              title="Final Usable Records"
              value={result.final_count.toLocaleString()}
              subtitle={`${((result.final_count / result.original_count) * 100).toFixed(1)}% retained`}
              badge="Retained"
              badgeColor="green"
            />
          </div>

          {/* Binning Smoothing Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Data Smoothing via Equi-Depth Binning (UnitPrice)
              </h2>
              <p className="text-xs text-slate-500">
                20 sorted sample records partitioned into 5 bins, smoothed by bin means, bin medians, and bin boundaries.
              </p>
            </div>

            <DataTable
              columns={smoothingColumns}
              data={result.smoothing_table}
              searchable={false}
              pageSize={10}
              exportFileName="binning_smoothing.csv"
            />
          </div>

          {/* Normalization Table & Summary */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Normalization of Numeric Attributes (Quantity)
              </h2>
              <p className="text-xs text-slate-500">
                Min-Max scaling to [0, 1], Z-Score standardisation (mean=0, std=1), and Decimal Scaling with power j={result.decimal_scaling_power}.
              </p>
            </div>

            <DataTable
              columns={normColumns}
              data={result.normalization_sample}
              searchable={false}
              pageSize={6}
              exportFileName="quantity_normalization.csv"
            />
          </div>
        </>
      )}
    </div>
  );
};
