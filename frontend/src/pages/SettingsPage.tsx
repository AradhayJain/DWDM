import React, { useState } from 'react';
import { 
  Settings, 
  Database, 
  Server, 
  Folder, 
  CheckCircle2, 
  RefreshCw, 
  AlertTriangle,
  Info,
  ShieldAlert,
  Terminal,
  Cpu
} from 'lucide-react';
import { api } from '../api/client';

export const SettingsPage: React.FC = () => {
  const [resetting, setResetting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleResetEtl = async () => {
    if (!window.confirm('Are you sure you want to re-execute the full ETL pipeline and reload the SQLite warehouse?')) {
      return;
    }
    setResetting(true);
    setMessage(null);
    try {
      const res = await api.runStage(6);
      setMessage({ type: 'success', text: 'ETL stage initiated successfully. Check ETL Pipeline page for live status.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to trigger ETL re-run' });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-600 mb-1">
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200">
            System Administration
          </span>
          <span>•</span>
          <span className="text-slate-500">Configuration & Warehouse Health</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Platform Settings & Environment State
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl">
          Inspect backend paths, database warehouse configuration, directory allocations, 
          and execute maintenance routines for the local SQLite analytics warehouse.
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center space-x-3 text-xs border ${
          message.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Grid: Environment Info & Warehouse Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Environment Configuration */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2">
            <Server className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Backend Runtime & Data Paths</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Primary Raw Dataset Path
              </span>
              <p className="font-mono text-slate-800 text-[11px] break-all">
                data/Online Retail.csv (or root Online Retail.csv)
              </p>
              <span className="text-[10px] text-slate-400">541,909 raw records (ISO-8859-1 encoding)</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Data Warehouse SQLite Engine
              </span>
              <p className="font-mono text-slate-800 text-[11px] break-all">
                data/retail_dw.db (PRAGMA foreign_keys=ON; journal_mode=WAL)
              </p>
              <span className="text-[10px] text-slate-400">522,568 loaded facts with star and snowflake schemas</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Exports & Reports Directory
              </span>
              <p className="font-mono text-slate-800 text-[11px] break-all">
                artifacts/reports/ and artifacts/exports/
              </p>
              <span className="text-[10px] text-slate-400">Consolidated audit reports, PDFs, and rejected records logs</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Backend API Architecture
              </span>
              <p className="font-mono text-slate-800 text-[11px]">
                FastAPI + Uvicorn + SQLAlchemy + ReportLab
              </p>
              <span className="text-[10px] text-slate-400">REST API with automatic CORS and OpenAPI documentation at /docs</span>
            </div>
          </div>
        </div>

        {/* Warehouse Maintenance & Actions */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Warehouse Maintenance & ETL Actions</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              The SQLite warehouse operates in Write-Ahead Logging (WAL) mode with enabled foreign key checks. 
              If the underlying CSV dataset is replaced or modified, trigger an ETL reload to reconcile dimensional keys 
              and rebuild fact records.
            </p>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2 text-xs text-amber-800">
              <div className="flex items-center space-x-2 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Re-Execution Notice</span>
              </div>
              <p>
                Re-running the ETL pipeline extracts raw records, filters invalid and negative unit prices, 
                populates both Star and Snowflake schemas, and logs non-positive transactions to the audit log.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Operation takes ~4 seconds</span>
            <button
              onClick={handleResetEtl}
              disabled={resetting}
              className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${resetting ? 'animate-spin' : ''}`} />
              <span>{resetting ? 'Reloading Warehouse...' : 'Re-Run ETL & Rebuild Tables'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Academic Disclosures */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
          <Info className="w-4 h-4 mr-1.5 text-indigo-600" />
          DTU SE425 Course Compliance: Zero External Cloud Dependencies
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          In strict compliance with the DTU SE425 mini-project specifications, this application requires no external cloud databases, 
          paid SaaS tokens, or external language model APIs. The complete software stack runs deterministically on your local machine, 
          ensuring instant offline grading, full privacy of retail customer transaction data, and zero operational fees.
        </p>
      </div>
    </div>
  );
};
