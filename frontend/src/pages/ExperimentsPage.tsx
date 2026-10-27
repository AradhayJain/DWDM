import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FlaskConical, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Play, 
  Search, 
  Filter,
  Layers,
  Database,
  TrendingUp,
  Cpu,
  BarChart3
} from 'lucide-react';
import { api } from '../api/client';
import { PipelineStatus } from '../types';

export const ExperimentsPage: React.FC = () => {
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  const [filterUnit, setFilterUnit] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    api.getPipelineStatus().then(setPipelineStatus).catch(console.error);
  }, []);

  const experiments = [
    {
      id: 'exp1',
      number: 'Exp 1',
      unit: 'Unit 1 & 2',
      title: 'Dataset Exploration & Statistical Profiling',
      objective: 'Calculate dimensions, data types, missing rates, and numeric distributions on raw retail transactions.',
      algorithms: 'Univariate Descriptive Stats, Frequency Histograms, Interquartile Boxplots',
      route: '/explorer',
      stageId: 2,
    },
    {
      id: 'exp2',
      number: 'Exp 2',
      unit: 'Unit 2',
      title: 'Data Preprocessing & Normalization',
      objective: 'Handle missing attributes, remove duplicates, binning-based smoothing, and compare 3 normalization techniques.',
      algorithms: 'Mean/Median Imputation, Binning Smoothing, Min-Max, Z-score, Decimal Scaling',
      route: '/preprocessing',
      stageId: 4,
    },
    {
      id: 'exp3',
      number: 'Exp 3',
      unit: 'Unit 2',
      title: 'Data Reduction & Discretization',
      objective: 'Perform attribute subset selection, PCA projection with explained variance, and discretization binning.',
      algorithms: 'Mutual Information, PCA (2D/3D), Equal-Width, Equal-Frequency Binning',
      route: '/reduction',
      stageId: 5,
    },
    {
      id: 'exp4',
      number: 'Exp 4',
      unit: 'Unit 3',
      title: 'Data Warehouse Schemas (Star & Snowflake)',
      objective: 'Design and populate relational fact/dimension tables with foreign-key referential integrity.',
      algorithms: 'Dimensional Modeling, Star Schema, Normalized Snowflake Geographic Hierarchies',
      route: '/warehouse',
      stageId: 8,
    },
    {
      id: 'exp5',
      number: 'Exp 5',
      unit: 'Unit 3',
      title: 'OLAP Operations & Multidimensional Queries',
      objective: 'Execute multidimensional roll-up, drill-down, slice, dice, and pivot aggregations.',
      algorithms: 'GROUP BY Rollup Emulation, Cross-Tabulation Pivot, Multi-Axis Aggregates',
      route: '/olap',
      stageId: 9,
    },
    {
      id: 'exp6',
      number: 'Exp 6',
      unit: 'Unit 3',
      title: 'ETL Pipeline & Row-Count Reconciliation Audit',
      objective: 'Extract raw transactions, validate formats, enrich regional mappings, and audit warehouse reconciliation.',
      algorithms: 'Batch ETL, Deterministic Type Conversion, Foreign Key Audit Reconciliation',
      route: '/etl',
      stageId: 6,
    },
    {
      id: 'exp7-9',
      number: 'Exp 7–9',
      unit: 'Unit 4',
      title: 'Association Rule Mining (Apriori vs. FP-Growth)',
      objective: 'Benchmark Apriori and FP-Growth performance and evaluate frequent itemsets across 11 interestingness measures.',
      algorithms: 'Apriori, FP-Tree Growth, Support, Confidence, Lift, Leverage, Conviction, Chi-Square, Cosine',
      route: '/association',
      stageId: 10,
    },
    {
      id: 'exp10-11',
      number: 'Exp 10–11',
      unit: 'Unit 5',
      title: 'Classification & Cross-Validation Benchmarks',
      objective: 'Train supervised models to predict repeat customer purchase with zero future target leakage.',
      algorithms: 'Decision Tree (Gini/Entropy), Naive Bayes, K-Nearest Neighbours, 10-Fold CV, ROC/AUC',
      route: '/classification',
      stageId: 11,
    },
    {
      id: 'exp12',
      number: 'Exp 12',
      unit: 'Unit 5',
      title: 'Customer Clustering & Density Outlier Detection',
      objective: 'Compute customer RFM features, derive optimal cluster counts (k=4), and isolate anomalous spending profiles.',
      algorithms: 'K-Means (Elbow & Silhouette), Ward Hierarchical Clustering, DBSCAN Density Outliers',
      route: '/clustering',
      stageId: 12,
    },
    {
      id: 'unit6a',
      number: 'Unit 6A',
      unit: 'Unit 6',
      title: 'Multidimensional Analysis & Descriptive Summaries',
      objective: 'Perform complex multi-cube slices and drill-downs across temporal, product, and geographic dimensions.',
      algorithms: 'OLAP Engine Slicing, Dicing, Dimensional Hierarchies',
      route: '/olap',
      stageId: 9,
    },
    {
      id: 'unit6b',
      number: 'Unit 6B',
      unit: 'Unit 6',
      title: 'Spatial Database Mining & GPS Density Clustering',
      objective: 'Analyze country sales distribution and cluster coordinate points using spherical Haversine distances.',
      algorithms: 'Spherical Haversine Metric, Spatial DBSCAN Clustering, Bounding Box Validation',
      route: '/unit6/spatial',
      stageId: 16,
    },
    {
      id: 'unit6c',
      number: 'Unit 6C',
      unit: 'Unit 6',
      title: 'Multimedia Mining & Image Perceptual Hashing',
      objective: 'Extract visual metadata, detect exact byte duplicates (MD5) and visual perceptual duplicates (pHash).',
      algorithms: 'MD5 Cryptographic Hash, DCT Perceptual pHash (Hamming Distance), Color K-Means',
      route: '/unit6/multimedia',
      stageId: 17,
    },
    {
      id: 'unit6d',
      number: 'Unit 6D',
      unit: 'Unit 6',
      title: 'Time-Series Forecasting & Sequential Pattern Mining',
      objective: 'Evaluate sales forecasts on chronological holdouts and extract customer purchasing sequence journeys.',
      algorithms: 'Resampling, Moving Averages, Linear Trend, Holdout MAE/RMSE/MAPE, Sequential Transitions',
      route: '/timeseries',
      stageId: 13,
    },
    {
      id: 'unit6e',
      number: 'Unit 6E',
      unit: 'Unit 6',
      title: 'Text Database Mining & Catalog Semantic Discovery',
      objective: 'Vectorize unstructured product descriptions, search via cosine similarity, and cluster catalog keywords.',
      algorithms: 'Tokenization, TF-IDF Vectorizer, Cosine Similarity Search, Keyword Cluster Profiling',
      route: '/text',
      stageId: 15,
    },
    {
      id: 'unit6f',
      number: 'Unit 6F',
      unit: 'Unit 6',
      title: 'Applications & Trends in Enterprise Data Mining',
      objective: 'Map lab findings to real business problems and synthesize state-of-the-art streaming and ethical AI trends.',
      algorithms: 'Synthesis of Practical Retail Applications, Streaming Algorithms, Ethical AI Governance',
      route: '/unit6/applications-trends',
      stageId: 18,
    },
  ];

  const getStageStatus = (stageId: number) => {
    if (!pipelineStatus) return 'pending';
    const s = pipelineStatus.stages.find((st) => st.stage_id === stageId);
    return s ? s.status : 'pending';
  };

  const filteredExperiments = experiments.filter((exp) => {
    const matchesUnit = filterUnit === 'all' || exp.unit.includes(filterUnit);
    const matchesSearch = 
      exp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.objective.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.algorithms.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesUnit && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-600 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200">
                DTU SE425 Course Syllabus
              </span>
              <span>•</span>
              <span className="text-slate-500">Master Laboratory Index</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Practical Experiments Master Directory
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              Complete catalog of all 12 practical laboratory experiments and Unit 6 complex data mining modules. 
              Each experiment is backed by executable Python algorithms, rigorous mathematical implementations, 
              and persistent SQLite warehouse tables.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to="/reports"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1.5"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Consolidated Report</span>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search experiments, methods, algorithms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Filter Unit:</span>
            {['all', 'Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Unit 5', 'Unit 6'].map((unit) => (
              <button
                key={unit}
                onClick={() => setFilterUnit(unit)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  filterUnit === unit
                    ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {unit === 'all' ? 'All Units' : unit}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Experiment Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredExperiments.map((exp) => {
          const status = getStageStatus(exp.stageId);
          return (
            <div
              key={exp.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-md border border-indigo-100">
                      {exp.number}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500">
                      {exp.unit}
                    </span>
                  </div>

                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                    status === 'success' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {status === 'success' ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Executed</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Ready</span>
                      </>
                    )}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                    {exp.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                    {exp.objective}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">Algorithms: </span>
                  <span className="line-clamp-1">{exp.algorithms}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Interactive Lab</span>
                <Link
                  to={exp.route}
                  className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  <span>Launch Experiment</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
