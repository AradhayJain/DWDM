import React, { useState, useEffect } from 'react';
import { Menu, Play, RefreshCw, FileText, CheckCircle, AlertCircle, Database } from 'lucide-react';
import { api } from '../api/client';
import { PipelineStatus } from '../types';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await api.getPipelineStatus();
      setStatus(res);
      setIsRunning(res.pipeline_status === 'running');
    } catch (_) {}
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleRunFullPipeline = async () => {
    try {
      setIsRunning(true);
      await api.runFullPipeline(true);
      await fetchStatus();
    } catch (e: any) {
      alert(e.message || 'Pipeline trigger failed');
      setIsRunning(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg lg:hidden"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700">
            <Database className="w-3.5 h-3.5 text-primary-600" />
            Online Retail.csv (541k)
          </span>

          {status && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                status.pipeline_status === 'completed'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : status.pipeline_status === 'running'
                  ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse'
                  : status.pipeline_status === 'partially_completed'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              {status.pipeline_status === 'completed' ? (
                <CheckCircle className="w-3 h-3" />
              ) : status.pipeline_status === 'running' ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <AlertCircle className="w-3 h-3" />
              )}
              Pipeline: {status.pipeline_status}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <a
          href="/api/reports/download/pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs"
        >
          <FileText className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden md:inline">Download PDF Report</span>
          <span className="md:hidden">Report</span>
        </a>

        <button
          onClick={handleRunFullPipeline}
          disabled={isRunning}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:hover:bg-primary-600 rounded-lg transition-colors shadow-xs shadow-primary-600/20"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Running...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Pipeline</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
