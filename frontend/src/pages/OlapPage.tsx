import React, { useState, useEffect } from 'react';
import { Layers, Play, Clock, Code, RefreshCw } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { api } from '../api/client';
import { OlapResult } from '../types';
import { DataTable } from '../components/DataTable';

export const OlapPage: React.FC = () => {
  const [operation, setOperation] = useState<string>('rollup');
  const [schemaType, setSchemaType] = useState<'star' | 'snowflake'>('star');
  const [drillLevel, setDrillLevel] = useState<'quarter' | 'month' | 'day'>('quarter');
  const [sliceCountry, setSliceCountry] = useState<string>('Germany');
  const [result, setResult] = useState<OlapResult | null>(null);
  const [loading, setLoading] = useState(false);

  const operations = [
    { id: 'rollup', label: 'Roll-Up', desc: 'Aggregate Quarter &rarr; Year & Total' },
    { id: 'drilldown', label: 'Drill-Down', desc: 'Navigate Year &rarr; Quarter &rarr; Month &rarr; Day' },
    { id: 'slice', label: 'Slice', desc: 'Filter single dimension (e.g. Country)' },
    { id: 'dice', label: 'Dice', desc: 'Sub-cube multi-dimension filter' },
    { id: 'pivot', label: 'Pivot', desc: 'Cross-tabulation (Country &times; Quarter)' },
    { id: 'cube', label: 'Cube', desc: 'All dimension grouping combinations' },
  ];

  const handleExecute = async () => {
    setLoading(true);
    try {
      const params: any = {
        operation,
        schema_type: schemaType,
        year: 2011,
      };

      if (operation === 'drilldown') {
        if (drillLevel === 'month') {
          params.quarter = 4;
        } else if (drillLevel === 'day') {
          params.quarter = 4;
          params.month = 11;
        }
      } else if (operation === 'slice') {
        params.country = sliceCountry;
      } else if (operation === 'dice') {
        params.countries = ['Germany', 'France', 'Ireland'];
        params.price_bands = ['Standard', 'Premium'];
      }

      const res = await api.runOlapQuery(params);
      setResult(res);
    } catch (e: any) {
      alert(`OLAP execution failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleExecute();
  }, [operation, schemaType, drillLevel, sliceCountry]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-mono mb-1.5 border border-blue-200">
            Experiment 5 & Unit 6A • Practical Syllabus Unit 3
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            OLAP Multi-Dimensional Analytics Explorer
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Execute authentic OLAP operations on the SQLite warehouse: Roll-up, Drill-down, Slice, Dice, Pivot, and Cube.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={schemaType}
            onChange={(e) => setSchemaType(e.target.value as any)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium"
          >
            <option value="star">Target: Star Schema</option>
            <option value="snowflake">Target: Snowflake Schema</option>
          </select>

          <button
            onClick={handleExecute}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>Execute OLAP</span>
          </button>
        </div>
      </div>

      {/* Operation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {operations.map((op) => (
          <button
            key={op.id}
            onClick={() => setOperation(op.id)}
            className={`p-3 rounded-xl border text-left transition-all ${
              operation === op.id
                ? 'bg-primary-50/40 border-primary-500 ring-2 ring-primary-500/20 text-primary-900'
                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
            }`}
          >
            <div className="font-bold text-xs">{op.label}</div>
            <div className="text-[10px] text-slate-500 mt-1 line-clamp-1">{op.desc}</div>
          </button>
        ))}
      </div>

      {/* Optional contextual sub-controls */}
      {operation === 'drilldown' && (
        <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-4 text-xs">
          <span className="font-semibold text-slate-700">Granularity Level:</span>
          {(['quarter', 'month', 'day'] as const).map((lvl) => (
            <label key={lvl} className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="drillLevel"
                value={lvl}
                checked={drillLevel === lvl}
                onChange={() => setDrillLevel(lvl)}
                className="text-primary-600 focus:ring-primary-500"
              />
              <span className="capitalize text-slate-700">{lvl} Level</span>
            </label>
          ))}
        </div>
      )}

      {operation === 'slice' && (
        <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-4 text-xs">
          <span className="font-semibold text-slate-700">Slice Country:</span>
          {['Germany', 'France', 'EIRE', 'Spain', 'Netherlands', 'Australia'].map((c) => (
            <button
              key={c}
              onClick={() => setSliceCountry(c)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                sliceCountry === c ? 'bg-primary-600 text-white border-primary-600' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Query Logic & Execution Telemetry */}
      {result && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary-700">
                {result.operation.toUpperCase()} Operation
              </span>
              <p className="text-xs text-slate-600 mt-0.5">{result.query_logic}</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Execution: <strong>{result.execution_time_ms} ms</strong></span>
              <span>•</span>
              <span><strong>{result.total_records}</strong> records</span>
            </div>
          </div>

          {/* Executed SQL Box */}
          <div className="bg-slate-900 rounded-lg p-3.5 text-slate-300 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] mb-2 uppercase font-semibold">
              <Code className="w-3.5 h-3.5" />
              <span>SQL Executed on SQLite Data Warehouse</span>
            </div>
            <pre className="text-emerald-400">{result.sql_executed}</pre>
          </div>
        </div>
      )}

      {/* Chart Representation */}
      {result && result.data.length > 0 && result.operation !== 'pivot' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">
            Visual Aggregation Profile
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Aggregated metric visualization ({result.chart_type})
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {result.operation === 'drilldown' ? (
                <LineChart data={result.data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey={drillLevel === 'day' ? 'date' : drillLevel === 'month' ? 'month_name' : 'quarter_name'} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v: any) => [`£${Number(v).toLocaleString()}`, 'Revenue']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#025aa1" strokeWidth={2} />
                </LineChart>
              ) : (
                <BarChart data={result.data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey={result.operation === 'slice' ? 'product' : result.operation === 'rollup' ? 'quarter' : 'market'}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v: any) => [`£${Number(v).toLocaleString()}`, 'Revenue']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  />
                  <Bar dataKey="revenue" fill="#025aa1" radius={[3, 3, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabular Result DataTable */}
      {result && (
        <DataTable
          title={`OLAP Result Matrix (${result.total_records} rows)`}
          columns={result.columns.map((c) => ({
            key: c,
            header: c.replace(/_/g, ' ').toUpperCase(),
            align: c === 'revenue' || c.startsWith('Q') || c === 'total_revenue' ? 'right' : 'left',
            render: (row) => {
              const val = row[c];
              if (c === 'revenue' || c.startsWith('Q') || c === 'total_revenue') {
                return <span className="font-mono font-semibold">£{Number(val || 0).toLocaleString()}</span>;
              }
              return String(val ?? '—');
            },
          }))}
          data={result.data}
          exportFileName={`olap_${result.operation}_results.csv`}
        />
      )}
    </div>
  );
};
