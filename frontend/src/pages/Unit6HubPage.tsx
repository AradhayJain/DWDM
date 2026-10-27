import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Layers, 
  MapPin, 
  Image as ImageIcon, 
  TrendingUp, 
  FileText, 
  Cpu, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles,
  Info
} from 'lucide-react';

export const Unit6HubPage: React.FC = () => {
  const modules = [
    {
      id: 'multidimensional',
      title: '12A. Multidimensional Analysis & Descriptive Mining',
      icon: Layers,
      color: 'blue',
      badge: 'Integrated with OLAP',
      desc: 'Multidimensional slice, dice, roll-up, drill-down, and cross-tabulation across time, geography, customer, and product hierarchies.',
      route: '/olap',
      tags: ['Star/Snowflake Schema', 'Slice & Dice', 'Pivot', 'Rollup'],
    },
    {
      id: 'spatial',
      title: '12B. Spatial Database Mining',
      icon: MapPin,
      color: 'emerald',
      badge: 'Dual Mode: Retail + GPS',
      desc: 'Geographic sales distribution across 38 countries plus coordinate dataset upload, bounding-box filtering, Haversine metric distances, and spatial DBSCAN clustering.',
      route: '/unit6/spatial',
      tags: ['Country Breakdown', 'Coordinate Scatter', 'Haversine Metric', 'Spatial DBSCAN'],
    },
    {
      id: 'multimedia',
      title: '12C. Multimedia Database Mining',
      icon: ImageIcon,
      color: 'purple',
      badge: 'Live Image Ingestion',
      desc: 'Image metadata extraction (dimensions, DPI, aspect ratio), exact MD5 duplicate tagging, perceptual pHash duplicate detection, and color histogram visual clustering.',
      route: '/unit6/multimedia',
      tags: ['Metadata Inspection', 'MD5 Hashing', 'pHash / dHash', 'Color Histograms'],
    },
    {
      id: 'timeseries-sequence',
      title: '12D. Time-Series & Sequence Mining',
      icon: TrendingUp,
      color: 'amber',
      badge: 'Chronological Splitting',
      desc: 'Resampling transaction volumes, rolling averages, seasonality indicators, holdout forecast benchmarks (Naive, MA, Linear Trend), and customer sequential purchasing journeys.',
      route: '/timeseries',
      tags: ['Resampling', 'Leakage-Safe Holdout', 'Forecast Metrics', 'Sequential Patterns'],
    },
    {
      id: 'text',
      title: '12E. Text Database Mining',
      icon: FileText,
      color: 'cyan',
      badge: 'TF-IDF & Cosine Similarity',
      desc: 'Text normalization, n-gram extraction, TF-IDF vectorization, lexical vs. semantic similarity product search, description clustering, and keyword revenue impact.',
      route: '/text',
      tags: ['Tokenization', 'TF-IDF', 'Cosine Search', 'K-Means Keyword Themes'],
    },
    {
      id: 'applications-trends',
      title: '12F. Applications & Trends in Data Mining',
      icon: Cpu,
      color: 'rose',
      badge: 'DTU Syllabus Synthesis',
      desc: 'Industry business problem mappings, real experiment findings, streaming data architectures, high-dimensional challenges, and responsible AI governance.',
      route: '/unit6/applications-trends',
      tags: ['Business Impact', 'Scalable Mining', 'Streaming Analytics', 'Responsible AI'],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-xl p-8 text-white border border-slate-800 shadow-lg">
        <div className="flex items-center space-x-3 mb-3">
          <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-semibold rounded-full border border-indigo-500/30">
            DTU SE425 Syllabus Unit 6
          </span>
          <span className="text-xs text-slate-400">Complex Data Mining Modules</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-3">
          Unit 6: Mining Complex Types of Data
        </h1>
        <p className="text-slate-300 max-w-3xl leading-relaxed text-sm">
          Unlike standard relational tables, enterprise retail intelligence involves heterogeneous, semi-structured, 
          spatial, multimedia, temporal, and unstructured data types. This hub provides direct access to all six 
          required Unit 6 practical laboratory subpages with real backend computing pipelines.
        </p>
      </div>

      {/* Info Callout */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-900">
          <p className="font-semibold mb-1">Academic Requirement Notice (DTU SE425):</p>
          <p>
            All experiments in this unit execute real mathematical models and data transformations without artificial mockups. 
            Spatial and Multimedia experiments accept uploaded datasets or utilize pre-packaged sample files generated from 
            real product assets and coordinate feeds.
          </p>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <div 
              key={mod.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between overflow-hidden group"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {mod.badge}
                  </span>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900 text-base mb-1.5 group-hover:text-indigo-600 transition-colors">
                    {mod.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                    {mod.desc}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-2">
                  {mod.tags.map((tag) => (
                    <span key={tag} className="text-[10px] bg-slate-50 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                <Link
                  to={mod.route}
                  className="flex items-center justify-between text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  <span>Launch Module</span>
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
