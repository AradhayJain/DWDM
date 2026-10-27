export interface OverviewMetrics {
  raw_records: number;
  clean_records: number;
  cancelled_records: number;
  total_revenue: number;
  total_invoices: number;
  known_customers: number;
  unique_products: number;
  countries_count: number;
  top_countries: { country: string; revenue: number }[];
  revenue_trend: { month: string; revenue: number }[];
  pipeline_status: string;
}

export interface DatasetProfile {
  filepath: string;
  total_rows: number;
  total_columns: number;
  columns: string[];
  column_types: Record<string, string>;
  attribute_kinds: Record<string, string>;
  missing_values: Record<string, number>;
  missing_percentages: Record<string, number>;
  unique_counts: Record<string, number>;
  numeric_stats: Record<string, Record<string, number>>;
  date_range: { start: string; end: string };
  cancelled_count: number;
  skewness: Record<string, number>;
  top_countries: { country: string; count: number; percentage: number }[];
  sample_rows: Record<string, any>[];
  histograms: {
    unit_price_log10: { bin: string; count: number }[];
    quantity_log10: { bin: string; count: number }[];
  };
  boxplots: Record<string, {
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
    clipped_at_99th: number;
  }>;
}

export interface PreprocessingResult {
  original_count: number;
  missing_before: Record<string, number>;
  missing_after: Record<string, number>;
  guest_checkouts: number;
  duplicates_removed: number;
  cancellations_removed: number;
  invalid_removed: number;
  final_count: number;
  smoothing_table: {
    index: number;
    UnitPrice: number;
    bin: number;
    bin_mean: number;
    bin_median: number;
    bin_boundary: number;
  }[];
  normalization_sample: Record<string, any>[];
  normalization_summary: Record<string, any>;
  decimal_scaling_power: number;
}

export interface ReductionResult {
  customer_count: number;
  attribute_count: number;
  class_balance: Record<string, number>;
  mutual_info_scores: { feature: string; importance: number }[];
  rfe_selected_features: string[];
  redundant_pairs: { feature_1: string; feature_2: string; correlation: number }[];
  pca_explained_variance: number[];
  pca_cumulative_variance: number[];
  pca_90_variance_components: number;
  pca_loadings: Record<string, any>[];
  discretization_equal_width: { edges: number[]; counts: number[] };
  discretization_equal_freq: { edges: number[]; counts: number[] };
  spend_level_crosstab: {
    index: string[];
    lapsed_0: number[];
    active_1: number[];
    total: number[];
  };
  time_hierarchy_samples: Record<string, any>[];
  location_hierarchy: { region: string; revenue_share: number }[];
}

export interface SchemaTable {
  name: string;
  type: string;
  columns: { name: string; type: string; is_pk: boolean }[];
  row_count: number;
  primary_keys: string[];
  foreign_keys: { from: string; to_table: string; to_column: string }[];
  sample_data: Record<string, any>[];
}

export interface WarehouseSchema {
  schema_type: string;
  tables: SchemaTable[];
  relationships: { from_table: string; from_column: string; to_table: string; to_column: string }[];
  total_sales_revenue: number;
  total_fact_rows: number;
}

export interface OlapResult {
  operation: string;
  query_logic: string;
  sql_executed: string;
  columns: string[];
  data: Record<string, any>[];
  total_records: number;
  execution_time_ms: number;
  chart_type: string;
}

export interface AssociationResult {
  baskets_count: number;
  items_count: number;
  avg_basket_size: number;
  top_frequent_items: { item: string; support: number }[];
  itemsets_count: number;
  itemsets_by_size: Record<string, number>;
  rules_count: number;
  rules: {
    antecedents: string[];
    consequents: string[];
    support: number;
    confidence: number;
    lift: number;
    leverage: number;
    conviction: number;
  }[];
  algorithm_comparison: {
    min_support: number;
    apriori_itemsets: number;
    apriori_rules: number;
    apriori_ms: number;
    fpgrowth_itemsets: number;
    fpgrowth_rules: number;
    fpgrowth_ms: number;
    identical_results: boolean;
  }[];
  measures_table: {
    pair: string;
    item_a: string;
    item_b: string;
    support: number;
    confidence: number;
    lift: number;
    chi2: number;
    all_conf: number;
    cosine: number;
    kulc: number;
  }[];
  null_invariance_demo: {
    condition: string;
    total_transactions: number;
    lift: number;
    chi2: number;
    all_conf: number;
    cosine: number;
    kulc: number;
  }[];
}

export interface ClassificationResult {
  task_description: string;
  customer_counts: {
    total: number;
    train: number;
    test: number;
    active_1: number;
    lapsed_0: number;
  };
  majority_baseline: number;
  entropy_class: number;
  best_attribute_splits: { feature: string; info_gain: number; threshold: number }[];
  model_results: {
    model_name: string;
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    auc: number;
    cv_accuracy_mean: number;
    cv_accuracy_std: number;
    beats_baseline: boolean;
  }[];
  best_model_name: string;
  confusion_matrices: Record<string, {
    matrix: number[][];
    labels: string[];
    tn: number;
    fp: number;
    fn: number;
    tp: number;
  }>;
  feature_importances: { feature: string; importance: number }[];
  tree_rules_text: string;
  roc_curves: Record<string, { fpr: number; tpr: number }[]>;
  knn_k_search: { k: number; cv_accuracy: number }[];
}

export interface ClusteringResult {
  total_customers: number;
  features_used: string[];
  elbow_inertia: { k: number; sse: number }[];
  silhouette_by_k: { k: number; silhouette: number }[];
  best_k_silhouette: number;
  chosen_k: number;
  cluster_profiles: {
    cluster_id: number;
    segment_name: string;
    customer_count: number;
    percentage: number;
    avg_recency_days: number;
    avg_frequency_invoices: number;
    avg_monetary_revenue: number;
  }[];
  overall_silhouette: number;
  pca_scatter: {
    customer_id: number;
    x: number;
    y: number;
    cluster: number;
    segment: string;
    recency: number;
    frequency: number;
    monetary: number;
  }[];
  hierarchical_sizes: number[];
  hierarchical_silhouette: number;
  hierarchical_agreement: {
    kmeans_labels: number[];
    hierarchical_labels: number[];
    matrix: number[][];
  };
  dbscan_clusters: number;
  dbscan_noise_count: number;
  dbscan_noise_percent: number;
  outlier_samples: {
    customer_id: number;
    recency: number;
    frequency: number;
    monetary: number;
    reason: string;
  }[];
}

export interface TimeSeriesResult {
  frequency_name: string;
  data_points: number;
  start_date: string;
  end_date: string;
  historical_series: {
    date: string;
    revenue: number;
    invoices: number;
    quantity: number;
    rolling_mean: number | null;
  }[];
  forecast_series: {
    date: string;
    actual: number;
    naive: number;
    moving_average: number;
    linear_trend: number;
  }[];
  metrics: Record<string, { MAE: number; RMSE: number; MAPE: number }>;
  trend_slope_per_period: number;
  rolling_stats: { date: string; rolling_mean: number | null; rolling_std: number | null }[];
}

export interface SequenceResult {
  eligible_customers: number;
  total_sequences: number;
  avg_sequence_length: number;
  repeat_purchase_rate: number;
  interval_stats: {
    mean_days: number;
    median_days: number;
    min_days: number;
    max_days: number;
    std_days: number;
  };
  frequent_transitions: {
    from_item: string;
    to_item: string;
    frequency: number;
    transition_probability: number;
  }[];
  sample_customer_journeys: {
    customer_id: number;
    total_invoices: number;
    steps: {
      step: number;
      date: string;
      item_count: number;
      sample_items: string[];
    }[];
  }[];
}

export interface TextMiningResult {
  corpus_size: number;
  vocab_size: number;
  top_terms: { term: string; score: number }[];
  themes: {
    theme_id: number;
    product_count: number;
    top_keywords: string[];
    total_revenue: number;
    sample_products: string[];
  }[];
  similarity_results?: {
    description: string;
    similarity_score: number;
    revenue: number;
  }[];
  keyword_revenue: { keyword: string; revenue: number }[];
}

export interface SpatialResult {
  mode: string;
  total_locations: number;
  valid_coordinates_count: number;
  bounding_box: {
    min_lat: number;
    max_lat: number;
    min_lon: number;
    max_lon: number;
  };
  locations: {
    name: string;
    city: string;
    country: string;
    latitude: number;
    longitude: number;
    cluster_id: number;
    is_outlier: boolean;
  }[];
  spatial_clusters: {
    cluster_id: number;
    name: string;
    point_count: number;
    is_noise: boolean;
  }[];
  retail_country_revenue: {
    country: string;
    revenue: number;
    orders: number;
    customers: number;
  }[];
  regional_share: { region: string; share: number }[];
}

export interface MultimediaResult {
  total_images: number;
  images_metadata: {
    filename: string;
    file_size_kb: number;
    width: number;
    height: number;
    aspect_ratio: number;
    format: string;
    color_mode: string;
    md5_hash: string;
    phash: string;
    dhash: string;
  }[];
  exact_duplicates: { hash: string; filenames: string[]; count: number }[];
  perceptual_duplicates: {
    image_1: string;
    image_2: string;
    hamming_distance: number;
    similarity: number;
    is_exact_file_match: boolean;
  }[];
  visual_clusters: {
    cluster_id: number;
    image_count: number;
    images: string[];
  }[];
}

export interface StageStatus {
  stage_id: number;
  stage_name: string;
  syllabus_unit: string;
  status: "pending" | "running" | "success" | "failed" | "waiting_input" | "skipped";
  started_at: string | null;
  completed_at: string | null;
  duration_sec: number;
  summary: string | null;
  error: string | null;
  requires_input: boolean;
}

export interface PipelineStatus {
  pipeline_status: string;
  active_job_id: string | null;
  stages: StageStatus[];
  last_updated: string;
}
