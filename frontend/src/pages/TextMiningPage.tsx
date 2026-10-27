import React, { useState, useEffect } from 'react';
import { FileText, Play, RefreshCw, Search, Tag, DollarSign, Layers } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { api } from '../api/client';
import { TextMiningResult } from '../types';
import { MetricCard } from '../components/MetricCard';
import { DataTable } from '../components/DataTable';

export const TextMiningPage: React.FC = () => {
  const [result, setResult] = useState<TextMiningResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('HEART T-LIGHT');
  const [nClusters, setNClusters] = useState(6);

  const handleMine = async () => {
    setLoading(true);
    try {
      const data = await api.analyzeText({
        query,
        top_products_count: 1500,
        n_clusters: nClusters,
        min_df: 3,
      });
      setResult(data);
    } catch (e: any) {
      alert(`Text mining failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleMine();
  }, [nClusters]);

  const searchCols = [
    { key: 'description', header: 'Catalog Product Description' },
    {
      key: 'similarity_score',
      header: 'Cosine Similarity',
      align: 'right' as const,
      render: (r: any) => (
        <span className="font-bold text-primary-700 font-mono">
          {(r.similarity_score * 100).toFixed(1)}%
        </span>
      ),
    },
    {
      key: 'revenue',
      header: 'Historical Revenue (£)',
      align: 'right' as const,
      render: (r: any) => `£${r.revenue.toLocaleString()}`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-mono mb-1.5 border border-blue-200">
            Unit 6E • Complex Data Mining
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Text Database Mining & Catalog Semantics
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tokenization, TF-IDF vectorization of product descriptions, thematic category clustering,
            vector space cosine similarity search, and keyword-level revenue analysis.
          </p>
        </div>

        <button
          onClick={handleMine}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
        >
          {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>Run Text Mining</span>
        </button>
      </div>

      {/* Interactive Query Box */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">
          Cosine Similarity Search & Thematic Configuration
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter product description terms (e.g. HEART T-LIGHT, LUNCH BAG, MUG)..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={nClusters}
              onChange={(e) => setNClusters(parseInt(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800"
            >
              <option value={4}>4 Thematic Clusters</option>
              <option value={6}>6 Thematic Clusters</option>
              <option value={8}>8 Thematic Clusters</option>
            </select>

            <button
              onClick={handleMine}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {result && (
        <>
          {/* Top KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              title="Corpus Descriptions"
              value={result.corpus_size.toLocaleString()}
              subtitle="Top products analyzed"
              icon={FileText}
            />
            <MetricCard
              title="Extracted Vocabulary"
              value={result.vocab_size.toLocaleString()}
              subtitle="TF-IDF terms (min_df=3)"
              icon={Tag}
              badge="Vocabulary"
              badgeColor="blue"
            />
            <MetricCard
              title="Discovered Themes"
              value={result.themes.length}
              subtitle="K-Means description clusters"
              icon={Layers}
              badge="Categories"
              badgeColor="purple"
            />
            <MetricCard
              title="Keyword Revenue"
              value={`£${(result.keyword_revenue[0]?.revenue / 1000).toFixed(0)}k`}
              subtitle={`Top term: "${result.keyword_revenue[0]?.keyword}"`}
              icon={DollarSign}
              badge="Sales Driver"
              badgeColor="green"
            />
          </div>

          {/* Cosine Similarity Search Results */}
          {result.similarity_results && result.similarity_results.length > 0 && (
            <DataTable
              title={`Most Similar Products to "${query}" (Vector Space Cosine Metric)`}
              columns={searchCols}
              data={result.similarity_results}
              searchable={false}
              pageSize={5}
              exportFileName="similar_products.csv"
            />
          )}

          {/* Thematic Clusters Cards */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Discovered Thematic Product Clusters (TF-IDF &plusmn; K-Means)
              </h2>
              <p className="text-xs text-slate-500">
                Automatically discovered product taxonomy themes based on lexical co-occurrence.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.themes.map((th) => (
                <div key={th.theme_id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">Theme #{th.theme_id}</span>
                    <span className="font-mono text-slate-500">{th.product_count} products</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {th.top_keywords.map((kw) => (
                      <span key={kw} className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-white text-primary-700 border border-slate-200">
                        {kw}
                      </span>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 space-y-1">
                    <div className="flex justify-between">
                      <span>Total Revenue:</span>
                      <strong className="text-slate-800 font-mono">£{th.total_revenue.toLocaleString()}</strong>
                    </div>
                    <div className="line-clamp-2 italic text-slate-600">
                      e.g., {th.sample_products.join(', ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Keyword Revenue Bar Chart */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">
              Top Description Keywords by Total Generated Revenue
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Lexical sales driver analysis (gross revenue in GBP attributed to product titles containing each keyword).
            </p>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={result.keyword_revenue} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis dataKey="keyword" type="category" tick={{ fontSize: 11, fill: '#334155' }} width={80} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v: any) => [`£${Number(v).toLocaleString()}`, 'Attributed Revenue']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  />
                  <Bar dataKey="revenue" fill="#0d9488" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
