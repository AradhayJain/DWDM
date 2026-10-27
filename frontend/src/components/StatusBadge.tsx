import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, XCircle, ArrowRightCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: 'pending' | 'running' | 'success' | 'failed' | 'waiting_input' | 'skipped' | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const normalized = status.toLowerCase();

  const configs: Record<string, { label: string; bg: string; text: string; border: string; icon: any }> = {
    success: {
      label: 'Success',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: CheckCircle2,
    },
    running: {
      label: 'Running',
      bg: 'bg-blue-50 animate-pulse',
      text: 'text-blue-700',
      border: 'border-blue-200',
      icon: Clock,
    },
    pending: {
      label: 'Pending',
      bg: 'bg-slate-50',
      text: 'text-slate-600',
      border: 'border-slate-200',
      icon: Clock,
    },
    failed: {
      label: 'Failed',
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      icon: XCircle,
    },
    waiting_input: {
      label: 'Needs Input',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: AlertTriangle,
    },
    skipped: {
      label: 'Skipped',
      bg: 'bg-slate-100',
      text: 'text-slate-500',
      border: 'border-slate-200',
      icon: ArrowRightCircle,
    },
  };

  const c = configs[normalized] || configs.pending;
  const Icon = c.icon;
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${padding} ${c.bg} ${c.text} ${c.border}`}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {c.label}
    </span>
  );
};
