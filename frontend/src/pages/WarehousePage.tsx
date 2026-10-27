import React, { useState, useEffect } from 'react';
import { Warehouse, RefreshCw, Key, Link2, Database, Table as TableIcon } from 'lucide-react';
import { api } from '../api/client';
import { WarehouseSchema, SchemaTable } from '../types';
import { MetricCard } from '../components/MetricCard';
import { DataTable } from '../components/DataTable';

export const WarehousePage: React.FC = () => {
  const [schemaType, setSchemaType] = useState<'star' | 'snowflake'>('star');
  const [schema, setSchema] = useState<WarehouseSchema | null>(null);
  const [selectedTable, setSelectedTable] = useState<SchemaTable | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSchema = async () => {
    setLoading(true);
    try {
      const data = await api.getWarehouseSchema(schemaType);
      setSchema(data);
      if (data.tables.length > 0) {
        setSelectedTable(data.tables[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchema();
  }, [schemaType]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-mono mb-1.5 border border-blue-200">
            Experiment 4 • Practical Syllabus Unit 3
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Relational Data Warehouse & Dimensional Modeling
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Genuine relational data warehouse stored in SQLite with full foreign-key constraints,
            supporting both Star Schema and normalized Snowflake Schema.
          </p>
        </div>

        {/* Schema Switcher */}
        <div className="flex items-center bg-slate-200/60 p-1 rounded-xl text-xs font-medium">
          <button
            onClick={() => setSchemaType('star')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              schemaType === 'star' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Star Schema (De-normalized)
          </button>
          <button
            onClick={() => setSchemaType('snowflake')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              schemaType === 'snowflake' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Snowflake Schema (Normalized)
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          title="Warehouse Revenue"
          value={schema ? `£${(schema.total_sales_revenue / 1000000).toFixed(2)}M` : '—'}
          subtitle="Sum of fact line revenues"
          icon={Warehouse}
          badge="Verified"
          badgeColor="green"
        />
        <MetricCard
          title="Fact Table Records"
          value={schema ? schema.total_fact_rows.toLocaleString() : '—'}
          subtitle="Grain: sales invoice line"
          icon={Database}
        />
        <MetricCard
          title="Dimensional Tables"
          value={schema ? schema.tables.length : '—'}
          subtitle={schemaType === 'star' ? '4 tables (Star)' : '7 tables (Snowflake)'}
          icon={TableIcon}
        />
        <MetricCard
          title="Relational Links"
          value={schema ? schema.relationships.length : '—'}
          subtitle="Foreign-key references"
          icon={Link2}
          badge="Referential"
          badgeColor="blue"
        />
      </div>

      {/* Architecture Cards & Relationships */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Dimensional Schema Architecture ({schemaType === 'star' ? 'Star Schema' : 'Snowflake Schema'})
            </h2>
            <p className="text-xs text-slate-500">
              {schemaType === 'star'
                ? 'Central fact_sales table directly joined to dim_date, dim_product, and dim_customer.'
                : 'Normalized dimension hierarchies: dim_customer → dim_country → dim_region, and dim_product → dim_price_band.'}
            </p>
          </div>
          <button
            onClick={fetchSchema}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Table Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {schema?.tables.map((tbl) => {
            const isSelected = selectedTable?.name === tbl.name;
            const isFact = tbl.type === 'fact';
            return (
              <div
                key={tbl.name}
                onClick={() => setSelectedTable(tbl)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary-500 ring-2 ring-primary-500/20 bg-primary-50/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                      isFact
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {tbl.type}
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-700">
                    {tbl.row_count.toLocaleString()} rows
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 font-mono">{tbl.name}</h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  {tbl.columns.length} columns • {tbl.primary_keys.join(', ')} (PK)
                </p>

                <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1">
                  {tbl.columns.slice(0, 4).map((col) => (
                    <div key={col.name} className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-700 font-mono flex items-center gap-1">
                        {col.is_pk && <Key className="w-2.5 h-2.5 text-amber-500" />}
                        {col.name}
                      </span>
                      <span className="text-slate-400 font-mono text-[10px]">{col.type}</span>
                    </div>
                  ))}
                  {tbl.columns.length > 4 && (
                    <span className="text-[10px] text-slate-400 italic">
                      +{tbl.columns.length - 4} more attributes...
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Table Preview */}
      {selectedTable && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-primary-600" />
              <span>Sample Records: <strong>{selectedTable.name}</strong></span>
              <span className="text-xs font-mono text-slate-400 font-normal">
                ({selectedTable.row_count.toLocaleString()} total rows in warehouse)
              </span>
            </h3>
          </div>

          <DataTable
            columns={selectedTable.columns.map((c) => ({
              key: c.name,
              header: c.name,
              render: (row) => (
                <span className={c.is_pk ? 'font-bold text-primary-700 font-mono' : ''}>
                  {String(row[c.name] ?? '—')}
                </span>
              ),
            }))}
            data={selectedTable.sample_data}
            searchable={false}
            exportFileName={`${selectedTable.name}_sample.csv`}
          />
        </div>
      )}
    </div>
  );
};
