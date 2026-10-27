import React, { useState } from 'react';
import { 
  Cpu, 
  TrendingUp, 
  ShoppingCart, 
  Users, 
  Target, 
  MapPin, 
  Image as ImageIcon, 
  FileText, 
  ShieldCheck, 
  Layers, 
  Zap, 
  Globe, 
  HelpCircle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Unit6ApplicationsTrendsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'applications' | 'trends'>('applications');

  const practicalApplications = [
    {
      id: 'basket',
      title: 'Market-Basket Cross-Selling & Bundle Optimization',
      experiment: 'Experiments 7–9 (Apriori & FP-Growth)',
      problem: 'Online shoppers frequently purchase single items, leading to high shipping overhead and lower average order value (AOV).',
      method: 'Frequent itemset generation with FP-Growth; rule generation filtering by minimum Support ≥ 0.015, Confidence ≥ 0.50, and Lift > 2.0.',
      findings: 'Discovered high-lift rules between nostalgic ceramic sets (e.g., Pink Regency Tea Cup → Green Regency Tea Cup with Lift 14.8), proving natural affinity bundles.',
      enterpriseUse: 'Automated checkout recommendation widgets, promotional bundle pricing, and synchronized warehouse shelf-placement to minimize picker travel distance.',
      limitations: 'High lift on low-support rules can reflect statistical coincidences; does not establish causality (i.e., whether recommendation caused the purchase).',
      route: '/association',
      icon: ShoppingCart,
      color: 'blue'
    },
    {
      id: 'rfm',
      title: 'Customer Lifetime Value & RFM Segmentation',
      experiment: 'Experiment 12 (K-Means, Hierarchical & DBSCAN)',
      problem: 'Uniform email marketing blasts yield poor engagement and customer fatigue due to broad heterogeneity in purchasing patterns.',
      method: 'Recency-Frequency-Monetary (RFM) log-transformed feature vectors clustered via K-Means (k=4) and verified using Silhouette analysis and Ward dendrograms.',
      findings: 'Identified 4 distinct segments: Champions (high spend, recent), At-Risk Loyalists (high past spend, lapsed), Frequent Shoppers, and Hibernating/Lost customers.',
      enterpriseUse: 'Tailored automated drip campaigns: VIP reward incentives for Champions and re-engagement win-back discounts for At-Risk Loyalists.',
      limitations: 'Static snapshots do not track transition probabilities between clusters over time without Markov chain or survival modeling.',
      route: '/clustering',
      icon: Users,
      color: 'emerald'
    },
    {
      id: 'churn',
      title: 'Predictive Repeat-Purchase & Churn Classification',
      experiment: 'Experiments 10–11 (Decision Tree, Naive Bayes, kNN)',
      problem: 'Retailers reactively identify churned customers only after revenue has lapsed for months.',
      method: 'Leakage-safe temporal window split (Cutoff: Sep 1, 2011). Supervised training on historical order metrics to classify repeat purchase within 90 days.',
      findings: 'Pruned Decision Tree achieved 75.8% accuracy and 0.72 F1-score with Recency and Monetary metrics serving as the root split criteria.',
      enterpriseUse: 'Proactive retention triggers dispatched to customer service 30 days before projected churn date.',
      limitations: 'Class imbalance requires threshold tuning; macroeconomic external factors are not captured in pure transaction histories.',
      route: '/classification',
      icon: Target,
      color: 'purple'
    },
    {
      id: 'forecasting',
      title: 'Demand Planning & Inventory Replenishment Forecasting',
      experiment: 'Unit 6D / Time-Series Analysis',
      problem: 'Stockouts during peak demand and excess inventory holding costs during seasonal troughs.',
      method: 'Daily and weekly sales aggregation, rolling moving averages, trend decomposition, and 30-day out-of-sample holdout validation (MAE/RMSE/MAPE).',
      findings: 'Revealed pronounced Q4 holiday surge (October–November spikes) and cyclical weekday purchasing peaks with MAE £3,840 on daily volume.',
      enterpriseUse: 'Automated Purchase Order triggers aligned with supplier lead times and warehouse shelf allocation.',
      limitations: 'Univariate models cannot factor in marketing spend, flash sale announcements, or competitor price changes.',
      route: '/timeseries',
      icon: TrendingUp,
      color: 'amber'
    },
    {
      id: 'text',
      title: 'Product Catalog Organization & Search Discovery',
      experiment: 'Unit 6E / Text Database Mining',
      problem: 'Unstructured free-form invoice descriptions lead to spelling variations, duplicates, and poor search retrieval.',
      method: 'N-gram tokenization, TF-IDF vectorization, Cosine similarity search, and K-Means thematic keyword clustering.',
      findings: 'Automated clustering isolated distinctive product themes: Victorian Heart gifts, Christmas decorations, and Retro kitchenware.',
      enterpriseUse: 'Automated catalog tagging, search query autocomplete, and typo-tolerant related-product recommendations.',
      limitations: 'Lexical TF-IDF matches exact word stems and misses deep semantic synonyms (e.g., "beverage" vs "drink") without word embeddings.',
      route: '/text',
      icon: FileText,
      color: 'cyan'
    },
    {
      id: 'spatial',
      title: 'Geographic Logistics & Hub Location Optimization',
      experiment: 'Unit 6B / Spatial Database Mining',
      problem: 'Inefficient cross-border fulfillment routes and high international postage costs.',
      method: 'Spherical Haversine distance matrix formulation and DBSCAN spatial density clustering on retail coordinate points.',
      findings: 'Isolated dense geographic fulfillment hubs across the UK and Central Europe while identifying isolated overseas destinations as remote outliers.',
      enterpriseUse: 'Regional fulfillment center placement and dynamic shipping rate tiering based on spatial cluster proximity.',
      limitations: 'Requires explicit GPS latitude/longitude feeds; cannot infer accurate delivery routes without road network graph topologies.',
      route: '/unit6/spatial',
      icon: MapPin,
      color: 'rose'
    },
    {
      id: 'multimedia',
      title: 'Catalog Asset De-duplication & Quality Auditing',
      experiment: 'Unit 6C / Multimedia Database Mining',
      problem: 'Duplicate product uploads by multiple vendors clutter search rankings and waste server storage.',
      method: 'Multi-stage hashing: MD5 for exact byte duplicates followed by DCT Perceptual Hashing (pHash) for visually identical/resized images.',
      findings: 'Detected identical image assets despite divergent filenames and compression differences via pHash Hamming distance ≤ 6.',
      enterpriseUse: 'Automatic deduplication of merchant catalog photos and image-based product discovery.',
      limitations: 'Color histogram clustering groups by dominant background palettes rather than fine-grained object geometry.',
      route: '/unit6/multimedia',
      icon: ImageIcon,
      color: 'indigo'
    }
  ];

  const futureTrends = [
    {
      title: '1. Scalable & Distributed Data Mining',
      subtitle: 'From Single-Node Memory to Cloud Warehouses',
      badge: 'Architecture',
      icon: Layers,
      content: [
        'Enterprise retail datasets often exceed single-node RAM limits. Modern data warehousing leverages in-database computation and massively parallel processing (MPP) engines like BigQuery, Snowflake, and ClickHouse.',
        'Pushdown predicates and column-oriented parquet storage enable filtering billions of transaction rows in seconds without transferring data over network boundaries.',
        'Distributed ML frameworks (e.g., Spark MLlib, Ray) partition association-rule and clustering algorithms across compute clusters, overcoming the combinatorial explosion of candidate itemsets in Apriori.'
      ]
    },
    {
      title: '2. Streaming Data Mining & Real-Time Processing',
      subtitle: 'From Batch ETL to Event-Driven Intelligence',
      badge: 'Data Streams',
      icon: Zap,
      content: [
        'While batch ETL refreshes warehouse tables overnight, contemporary e-commerce relies on sub-second stream processing engines (Apache Flink, Kafka Streams).',
        'Streaming mining introduces distinct algorithmic challenges: single-pass processing, bounded memory budgets, and Concept Drift (where customer purchasing habits shift abruptly).',
        'Probabilistic data structures like Count-Min Sketch, HyperLogLog, and Reservoir Sampling enable real-time frequent-item and unique-visitor estimations with rigorous mathematical error bounds.'
      ]
    },
    {
      title: '3. High-Dimensional Data & Dimensionality Reduction',
      subtitle: 'Overcoming the Curse of Dimensionality',
      badge: 'Theory',
      icon: Cpu,
      content: [
        'As feature vectors expand to encompass thousands of product categories, clickstream sequences, and browsing timestamps, data becomes sparse and Euclidean distance loses discriminative power.',
        'Advanced non-linear manifold learning techniques such as t-SNE, UMAP, and deep Autoencoders compress high-dimensional consumer behavior into dense latent representations.',
        'Subspace clustering algorithms discover meaningful groupings that exist only within specific subsets of dimensions rather than the full feature space.'
      ]
    },
    {
      title: '4. Semantic Understanding & Foundation Models',
      subtitle: 'Beyond Lexical Bag-of-Words to Multi-Modal Embeddings',
      badge: 'AI Evolution',
      icon: Globe,
      content: [
        'Classical TF-IDF and bag-of-words representations depend strictly on lexical token overlap, missing underlying conceptual meaning, colloquialisms, and multilingual equivalents.',
        'Modern retail platforms deploy multi-modal foundation models (e.g., CLIP, Transformer sentence encoders) that project both product text descriptions and product images into a shared embedding space.',
        'This enables cross-modal search: a user can upload a photo of a handbag to retrieve semantically matching items from catalog text descriptions without manual keyword tagging.'
      ]
    },
    {
      title: '5. Responsible Data Mining, Privacy & Ethics',
      subtitle: 'Regulatory Compliance and Algorithmic Fairness',
      badge: 'Governance',
      icon: ShieldCheck,
      content: [
        'Regulatory frameworks such as GDPR and CCPA mandate strict privacy protections, user anonymization, and the "Right to Explanation" for automated profiling and credit decisions.',
        'Differential Privacy techniques inject calibrated mathematical noise into query responses and model updates, ensuring individual shopper records cannot be re-identified from aggregate warehouse statistics.',
        'Algorithmic bias auditing is essential in classification and churn models to prevent discriminatory treatment across demographic and geographic user segments.'
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-600 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200">
                DTU SE425 Practical Unit 6F
              </span>
              <span>•</span>
              <span className="text-slate-500">Capstone Synthesis</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Applications & Trends in Data Mining
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              Synthesizes laboratory findings with enterprise e-commerce applications and explores future 
              architectural trends in scalable, streaming, high-dimensional, and ethically governed data mining.
            </p>
          </div>

          <div className="flex border border-slate-200 rounded-lg p-1 bg-slate-50 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('applications')}
              className={`px-4 py-1.5 rounded-md transition-colors ${
                activeTab === 'applications'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Industry Applications ({practicalApplications.length})
            </button>
            <button
              onClick={() => setActiveTab('trends')}
              className={`px-4 py-1.5 rounded-md transition-colors ${
                activeTab === 'trends'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Academic Trends ({futureTrends.length})
            </button>
          </div>
        </div>
      </div>

      {/* Applications Tab */}
      {activeTab === 'applications' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {practicalApplications.map((app) => {
              const Icon = app.icon;
              return (
                <div 
                  key={app.id} 
                  className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">{app.title}</h3>
                          <span className="text-[11px] font-medium text-indigo-600">{app.experiment}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs space-y-2 pt-1">
                      <div>
                        <span className="font-semibold text-slate-700">Business Problem: </span>
                        <span className="text-slate-600">{app.problem}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">Methodology: </span>
                        <span className="text-slate-600">{app.method}</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="font-semibold text-slate-800">Observed Finding: </span>
                        <span className="text-slate-600">{app.findings}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-emerald-700">Enterprise Use: </span>
                        <span className="text-slate-600">{app.enterpriseUse}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-amber-700">Known Limitations: </span>
                        <span className="text-slate-600">{app.limitations}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                    <Link
                      to={app.route}
                      className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      <span>Inspect Live Experiment</span>
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Trends Tab */}
      {activeTab === 'trends' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {futureTrends.map((trend, idx) => {
              const Icon = trend.icon;
              return (
                <div key={idx} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">{trend.title}</h3>
                        <p className="text-xs text-slate-500">{trend.subtitle}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full border border-slate-200">
                      {trend.badge}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                    {trend.content.map((p, pidx) => (
                      <p key={pidx}>• {p}</p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Academic Disclosures */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-2">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
          <ShieldCheck className="w-4 h-4 mr-1.5 text-indigo-600" />
          DTU SE425 Academic Distinction: Implemented vs. Educational Trends
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          The 7 business applications detailed in the first tab represent <strong>experimentally validated implementations</strong> 
          derived directly from your local SQLite data warehouse and execution services. The future trends detailed in the second tab 
          represent <strong>theoretical syllabus topics</strong> required by DTU SE425 to contextualize batch data mining within 
          state-of-the-art cloud architectures and AI safety governance.
        </p>
      </div>
    </div>
  );
};
