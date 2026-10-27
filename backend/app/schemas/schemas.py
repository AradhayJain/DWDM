from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class DatasetProfileResponse(BaseModel):
    filepath: str
    total_rows: int
    total_columns: int
    columns: List[str]
    column_types: Dict[str, str]
    attribute_kinds: Dict[str, str]
    missing_values: Dict[str, int]
    missing_percentages: Dict[str, float]
    unique_counts: Dict[str, int]
    numeric_stats: Dict[str, Dict[str, float]]
    date_range: Dict[str, str]
    cancelled_count: int
    skewness: Dict[str, float]
    top_countries: List[Dict[str, Any]]
    sample_rows: List[Dict[str, Any]]
    histograms: Dict[str, Any]
    boxplots: Dict[str, Any]

class PreprocessingRequest(BaseModel):
    impute_description: bool = True
    guest_customer_handling: str = "zero" # "zero" or "exclude"
    remove_duplicates: bool = True
    remove_cancellations: bool = True
    remove_invalid_prices: bool = True
    binning_feature: str = "UnitPrice"
    binning_samples: int = 20
    normalization_feature: str = "Quantity"

class PreprocessingResponse(BaseModel):
    original_count: int
    missing_before: Dict[str, int]
    missing_after: Dict[str, int]
    guest_checkouts: int
    duplicates_removed: int
    cancellations_removed: int
    invalid_removed: int
    final_count: int
    smoothing_table: List[Dict[str, Any]]
    normalization_sample: List[Dict[str, Any]]
    normalization_summary: Dict[str, Any]
    decimal_scaling_power: int

class ReductionRequest(BaseModel):
    cutoff_date: str = "2011-09-01"
    discretization_bins: int = 4
    n_pca_components: int = 2
    rfe_features: int = 4

class ReductionResponse(BaseModel):
    customer_count: int
    attribute_count: int
    class_balance: Dict[str, int]
    mutual_info_scores: List[Dict[str, Any]]
    rfe_selected_features: List[str]
    redundant_pairs: List[Dict[str, Any]]
    pca_explained_variance: List[float]
    pca_cumulative_variance: List[float]
    pca_90_variance_components: int
    pca_loadings: List[Dict[str, Any]]
    discretization_equal_width: Dict[str, Any]
    discretization_equal_freq: Dict[str, Any]
    spend_level_crosstab: Dict[str, Any]
    time_hierarchy_samples: List[Dict[str, Any]]
    location_hierarchy: List[Dict[str, Any]]

class SchemaTable(BaseModel):
    name: str
    type: str # fact or dimension
    columns: List[Dict[str, Any]]
    row_count: int
    primary_keys: List[str]
    foreign_keys: List[Dict[str, Any]]
    sample_data: List[Dict[str, Any]]

class WarehouseSchemaResponse(BaseModel):
    schema_type: str # star or snowflake
    tables: List[SchemaTable]
    relationships: List[Dict[str, Any]]
    total_sales_revenue: float
    total_fact_rows: int

class OlapQueryRequest(BaseModel):
    operation: str # rollup, drilldown, slice, dice, pivot, cube
    schema_type: str = "star"
    year: Optional[int] = 2011
    quarter: Optional[int] = None
    month: Optional[int] = None
    country: Optional[str] = None
    countries: Optional[List[str]] = None
    price_bands: Optional[List[str]] = None
    row_dimension: Optional[str] = "country"
    col_dimension: Optional[str] = "quarter"
    metric: str = "revenue"

class OlapQueryResponse(BaseModel):
    operation: str
    query_logic: str
    sql_executed: str
    columns: List[str]
    data: List[Dict[str, Any]]
    total_records: int
    execution_time_ms: float
    chart_type: str

class AssociationRulesRequest(BaseModel):
    country: str = "United Kingdom"
    min_support: float = 0.02
    min_confidence: float = 0.6
    top_n_items: int = 100
    compare_algorithms: bool = True

class AssociationRulesResponse(BaseModel):
    baskets_count: int
    items_count: int
    avg_basket_size: float
    top_frequent_items: List[Dict[str, Any]]
    itemsets_count: int
    itemsets_by_size: Dict[str, int]
    rules_count: int
    rules: List[Dict[str, Any]]
    algorithm_comparison: Optional[List[Dict[str, Any]]] = None
    threshold_grid: Optional[Dict[str, Any]] = None
    measures_table: Optional[List[Dict[str, Any]]] = None
    null_invariance_demo: Optional[List[Dict[str, Any]]] = None

class ClassificationRequest(BaseModel):
    cutoff_date: str = "2011-09-01"
    algorithm: str = "DecisionTree" # DecisionTree, NaiveBayes, KNN, All
    tree_criterion: str = "entropy" # entropy, gini
    max_depth: Optional[int] = None
    ccp_alpha: float = 0.005
    knn_neighbors: int = 7

class ClassificationResponse(BaseModel):
    task_description: str
    customer_counts: Dict[str, int]
    majority_baseline: float
    entropy_class: float
    best_attribute_splits: List[Dict[str, Any]]
    model_results: List[Dict[str, Any]]
    best_model_name: str
    confusion_matrices: Dict[str, Any]
    feature_importances: Optional[List[Dict[str, Any]]] = None
    tree_rules_text: Optional[str] = None
    tree_visualization_data: Optional[Dict[str, Any]] = None
    roc_curves: Optional[Dict[str, Any]] = None
    knn_k_search: Optional[List[Dict[str, Any]]] = None

class ClusteringRequest(BaseModel):
    cutoff_date: str = "2011-09-01"
    n_clusters: int = 4
    dbscan_eps: float = 0.45
    dbscan_min_samples: int = 10

class ClusteringResponse(BaseModel):
    total_customers: int
    features_used: List[str]
    elbow_inertia: List[Dict[str, Any]]
    silhouette_by_k: List[Dict[str, Any]]
    best_k_silhouette: int
    chosen_k: int
    cluster_profiles: List[Dict[str, Any]]
    overall_silhouette: float
    pca_scatter: List[Dict[str, Any]]
    hierarchical_sizes: List[int]
    hierarchical_silhouette: float
    hierarchical_agreement: Dict[str, Any]
    dendrogram_data: Optional[Dict[str, Any]] = None
    dbscan_clusters: int
    dbscan_noise_count: int
    dbscan_noise_percent: float
    outlier_samples: List[Dict[str, Any]]

class TimeSeriesRequest(BaseModel):
    frequency: str = "W" # D, W, M
    forecast_horizon: int = 8

class TimeSeriesResponse(BaseModel):
    frequency_name: str
    data_points: int
    start_date: str
    end_date: str
    historical_series: List[Dict[str, Any]]
    forecast_series: List[Dict[str, Any]]
    metrics: Dict[str, Dict[str, float]] # MAE, RMSE, MAPE per model
    trend_slope_per_period: float
    rolling_stats: List[Dict[str, Any]]

class SequenceRequest(BaseModel):
    min_purchases: int = 2
    top_n_patterns: int = 20

class SequenceResponse(BaseModel):
    eligible_customers: int
    total_sequences: int
    avg_sequence_length: float
    repeat_purchase_rate: float
    interval_stats: Dict[str, float] # mean_days, median_days, min_days, max_days
    frequent_transitions: List[Dict[str, Any]]
    sample_customer_journeys: List[Dict[str, Any]]

class TextMiningRequest(BaseModel):
    query: Optional[str] = None
    top_products_count: int = 1500
    n_clusters: int = 6
    min_df: int = 3

class TextMiningResponse(BaseModel):
    corpus_size: int
    vocab_size: int
    top_terms: List[Dict[str, Any]]
    themes: List[Dict[str, Any]]
    similarity_results: Optional[List[Dict[str, Any]]] = None
    keyword_revenue: List[Dict[str, Any]]

class SpatialAnalyzeRequest(BaseModel):
    use_sample_if_none: bool = True
    dbscan_eps_km: float = 150.0 # kilometers
    dbscan_min_points: int = 2

class SpatialAnalyzeResponse(BaseModel):
    mode: str
    total_locations: int
    valid_coordinates_count: int
    bounding_box: Dict[str, float]
    locations: List[Dict[str, Any]]
    spatial_clusters: List[Dict[str, Any]]
    retail_country_revenue: List[Dict[str, Any]]
    regional_share: List[Dict[str, Any]]

class MultimediaAnalyzeRequest(BaseModel):
    use_sample_if_empty: bool = True

class MultimediaAnalyzeResponse(BaseModel):
    total_images: int
    images_metadata: List[Dict[str, Any]]
    exact_duplicates: List[Dict[str, Any]]
    perceptual_duplicates: List[Dict[str, Any]]
    visual_clusters: List[Dict[str, Any]]

class StageStatus(BaseModel):
    stage_id: int
    stage_name: str
    syllabus_unit: str
    status: str # pending, running, success, failed, waiting_input, skipped
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    duration_sec: float = 0.0
    summary: Optional[str] = None
    error: Optional[str] = None
    requires_input: bool = False

class PipelineStatusResponse(BaseModel):
    pipeline_status: str # idle, running, completed, partially_completed, failed
    active_job_id: Optional[str] = None
    stages: List[StageStatus]
    last_updated: str
