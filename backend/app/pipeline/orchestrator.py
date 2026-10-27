import time
import json
import uuid
import logging
import threading
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy import text
from backend.app.core.database import SessionLocal, Base, engine
from backend.app.models.warehouse import JobExecution
from backend.app.services.dataset_service import profile_dataset
from backend.app.services.preprocessing_service import preprocess_dataset
from backend.app.services.reduction_service import reduce_features
from backend.app.warehouse.loader import run_etl_pipeline
from backend.app.warehouse.schema import get_warehouse_schema
from backend.app.warehouse.olap import execute_olap_query
from backend.app.services.association_service import mine_association_rules
from backend.app.services.classification_service import classify_customers
from backend.app.services.clustering_service import cluster_customers
from backend.app.services.timeseries_service import analyze_timeseries
from backend.app.services.sequence_service import analyze_sequences
from backend.app.services.text_service import mine_text_database
from backend.app.services.spatial_service import analyze_spatial_database
from backend.app.services.multimedia_service import analyze_multimedia_database
from backend.app.services.report_service import generate_consolidated_report

logger = logging.getLogger("retail_dw.orchestrator")

STAGE_DEFINITIONS = [
    {"stage_id": 1, "stage_name": "Dataset Ingestion", "syllabus_unit": "Data Ingestion", "requires_input": False},
    {"stage_id": 2, "stage_name": "Dataset Profiling", "syllabus_unit": "Exp 1 (Exploration)", "requires_input": False},
    {"stage_id": 3, "stage_name": "Data-Quality Analysis", "syllabus_unit": "Exp 1 (Exploration)", "requires_input": False},
    {"stage_id": 4, "stage_name": "Data Preprocessing", "syllabus_unit": "Exp 2 (Preprocessing)", "requires_input": False},
    {"stage_id": 5, "stage_name": "Feature Reduction & Discretization", "syllabus_unit": "Exp 3 (Reduction)", "requires_input": False},
    {"stage_id": 6, "stage_name": "ETL Transformations", "syllabus_unit": "Exp 6 (ETL Pipeline)", "requires_input": False},
    {"stage_id": 7, "stage_name": "Warehouse Loading", "syllabus_unit": "Exp 4 (Warehouse)", "requires_input": False},
    {"stage_id": 8, "stage_name": "Star & Snowflake Schema Creation", "syllabus_unit": "Exp 4 (Schema)", "requires_input": False},
    {"stage_id": 9, "stage_name": "OLAP Analysis", "syllabus_unit": "Exp 5 / Unit 6A", "requires_input": False},
    {"stage_id": 10, "stage_name": "Association-Rule Mining", "syllabus_unit": "Exp 7-9 (Apriori/FP-Growth)", "requires_input": False},
    {"stage_id": 11, "stage_name": "Customer Classification", "syllabus_unit": "Exp 10-11 (Classification)", "requires_input": False},
    {"stage_id": 12, "stage_name": "Customer Clustering & Outliers", "syllabus_unit": "Exp 12 (Clustering)", "requires_input": False},
    {"stage_id": 13, "stage_name": "Time-Series Forecasting", "syllabus_unit": "Unit 6D (Time-Series)", "requires_input": False},
    {"stage_id": 14, "stage_name": "Sequence Mining", "syllabus_unit": "Unit 6D (Sequence)", "requires_input": False},
    {"stage_id": 15, "stage_name": "Text Database Mining", "syllabus_unit": "Unit 6E (Text Mining)", "requires_input": False},
    {"stage_id": 16, "stage_name": "Spatial Database Mining", "syllabus_unit": "Unit 6B (Spatial Mining)", "requires_input": False},
    {"stage_id": 17, "stage_name": "Multimedia Database Mining", "syllabus_unit": "Unit 6C (Multimedia Mining)", "requires_input": False},
    {"stage_id": 18, "stage_name": "Consolidated Reporting", "syllabus_unit": "Consolidated Audit", "requires_input": False},
]

class PipelineOrchestrator:
    def __init__(self):
        self._lock = threading.Lock()
        self.active_job_id: Optional[str] = None
        self.pipeline_status: str = "idle" # idle, running, completed, partially_completed, failed
        self.stage_states: Dict[int, Dict[str, Any]] = {}
        self.results_cache: Dict[str, Any] = {}
        self._init_stages()

    def _init_stages(self):
        for s in STAGE_DEFINITIONS:
            self.stage_states[s["stage_id"]] = {
                "stage_id": s["stage_id"],
                "stage_name": s["stage_name"],
                "syllabus_unit": s["syllabus_unit"],
                "status": "pending",
                "started_at": None,
                "completed_at": None,
                "duration_sec": 0.0,
                "summary": None,
                "error": None,
                "requires_input": s["requires_input"]
            }

    def get_status(self) -> Dict[str, Any]:
        with self._lock:
            stages_list = [self.stage_states[s["stage_id"]] for s in STAGE_DEFINITIONS]
            return {
                "pipeline_status": self.pipeline_status,
                "active_job_id": self.active_job_id,
                "stages": stages_list,
                "last_updated": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
            }

    def execute_stage(self, stage_id: int, parameters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        stage_meta = next((s for s in STAGE_DEFINITIONS if s["stage_id"] == stage_id), None)
        if not stage_meta:
            raise ValueError(f"Invalid stage_id: {stage_id}")

        params = parameters or {}
        st = self.stage_states[stage_id]
        st["status"] = "running"
        st["started_at"] = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        st["error"] = None

        t0 = time.perf_counter()
        result_data = None
        error_msg = None

        try:
            if stage_id == 1: # Ingestion
                profile = profile_dataset(params.get("csv_path"))
                self.results_cache["dataset_profile"] = profile
                result_data = {"total_rows": profile["total_rows"], "file": profile["filepath"]}
                st["summary"] = f"Ingested {profile['total_rows']:,} records from {profile['filepath']}."

            elif stage_id == 2: # Profiling
                profile = self.results_cache.get("dataset_profile") or profile_dataset(params.get("csv_path"))
                self.results_cache["dataset_profile"] = profile
                result_data = profile
                st["summary"] = f"Profiled {profile['total_columns']} attributes. Distinct invoices: {profile['unique_counts'].get('InvoiceNo', 0):,}."

            elif stage_id == 3: # Data Quality
                profile = self.results_cache.get("dataset_profile") or profile_dataset(params.get("csv_path"))
                cancelled = profile.get("cancelled_count", 0)
                missing_cust = profile["missing_values"].get("CustomerID", 0)
                result_data = {
                    "cancelled_invoices": cancelled,
                    "missing_customer_ids": missing_cust,
                    "missing_descriptions": profile["missing_values"].get("Description", 0)
                }
                st["summary"] = f"Quality audit: {cancelled:,} cancellations, {missing_cust:,} guest transactions."

            elif stage_id == 4: # Preprocessing
                prep = preprocess_dataset(csv_path=params.get("csv_path"))
                self.results_cache["preprocessing"] = prep
                result_data = prep
                st["summary"] = f"Cleaned dataset: {prep['final_count']:,} rows retained. Removed {prep['duplicates_removed']} duplicates, {prep['cancellations_removed']} cancellations."

            elif stage_id == 5: # Feature Reduction
                red = reduce_features(csv_path=params.get("csv_path"))
                self.results_cache["reduction"] = red
                result_data = red
                st["summary"] = f"Computed RFM customer features (N={red['customer_count']}). PCA 90% variance achieved with {red['pca_90_variance_components']} components."

            elif stage_id == 6: # ETL
                etl = run_etl_pipeline(csv_path=params.get("csv_path"))
                self.results_cache["etl_audit"] = etl
                result_data = etl
                st["summary"] = f"ETL Pipeline: Extracted {etl['raw_extracted_rows']:,} rows, populated {etl['loaded_fact_rows']:,} fact records into SQLite warehouse."

            elif stage_id == 7: # Warehouse Loading
                if "etl_audit" not in self.results_cache:
                    etl = run_etl_pipeline(csv_path=params.get("csv_path"))
                    self.results_cache["etl_audit"] = etl
                schema_info = get_warehouse_schema("star")
                self.results_cache["warehouse_schema"] = schema_info
                result_data = schema_info
                st["summary"] = f"Loaded {schema_info['total_fact_rows']:,} fact rows across 4 star schema tables (Total: GBP {schema_info['total_sales_revenue']:,.2f})."

            elif stage_id == 8: # Schema Creation
                star = get_warehouse_schema("star")
                snow = get_warehouse_schema("snowflake")
                self.results_cache["star_schema"] = star
                self.results_cache["snow_schema"] = snow
                result_data = {"star": star, "snowflake": snow}
                st["summary"] = f"Star schema (4 tables) and Snowflake schema (7 normalized tables) verified."

            elif stage_id == 9: # OLAP Analysis
                olap = execute_olap_query(operation="rollup", schema_type="star")
                self.results_cache["olap"] = olap
                result_data = olap
                st["summary"] = f"Executed multi-dimensional Roll-up aggregation in {olap['execution_time_ms']} ms ({olap['total_records']} rows)."

            elif stage_id == 10: # Association Rules
                rules = mine_association_rules(csv_path=params.get("csv_path"))
                self.results_cache["association_rules"] = rules
                result_data = rules
                st["summary"] = f"Mined {rules['itemsets_count']} itemsets and {rules['rules_count']} rules (Apriori & FP-Growth compared)."

            elif stage_id == 11: # Classification
                clf = classify_customers(csv_path=params.get("csv_path"))
                self.results_cache["classification"] = clf
                result_data = clf
                st["summary"] = f"Evaluated Decision Tree, Naive Bayes, and kNN. Best: {clf['best_model_name']} (Majority baseline: {clf['majority_baseline']:.3f})."

            elif stage_id == 12: # Clustering
                clust = cluster_customers(csv_path=params.get("csv_path"))
                self.results_cache["clustering"] = clust
                result_data = clust
                st["summary"] = f"K-Means (k=4, silhouette={clust['overall_sil']:.3f}), Ward Dendrogram, and DBSCAN ({clust['dbscan_noise_count']} outliers)."

            elif stage_id == 13: # Time Series Forecasting
                ts = analyze_timeseries(csv_path=params.get("csv_path"))
                self.results_cache["timeseries"] = ts
                result_data = ts
                st["summary"] = f"Weekly sales series analyzed ({ts['data_points']} weeks). Trend slope: {ts['trend_slope_per_period']:+.1f} GBP/wk."

            elif stage_id == 14: # Sequence Mining
                seq = analyze_sequences(csv_path=params.get("csv_path"))
                self.results_cache["sequences"] = seq
                result_data = seq
                st["summary"] = f"Mined {seq['total_sequences']:,} customer transaction timelines. Repeat purchase rate: {seq['repeat_purchase_rate']}%, avg interval: {seq['interval_stats']['mean_days']} days."

            elif stage_id == 15: # Text Mining
                txt = mine_text_database(csv_path=params.get("csv_path"))
                self.results_cache["text_mining"] = txt
                result_data = txt
                st["summary"] = f"TF-IDF vectorization of {txt['corpus_size']} products. Discovered {len(txt['themes'])} semantic clusters and top sales keywords."

            elif stage_id == 16: # Spatial Mining
                sp = analyze_spatial_database(retail_csv_path=params.get("csv_path"))
                self.results_cache["spatial"] = sp
                result_data = sp
                st["summary"] = f"Spatial DBSCAN clustered {sp['valid_coordinates_count']} European store coordinates into {len(sp['spatial_clusters'])} geographic clusters."

            elif stage_id == 17: # Multimedia Mining
                mm = analyze_multimedia_database()
                self.results_cache["multimedia"] = mm
                result_data = mm
                st["summary"] = f"Extracted metadata for {mm['total_images']} product images; detected {len(mm['exact_duplicates'])} exact and {len(mm['perceptual_duplicates'])} perceptual duplicate pairs."

            elif stage_id == 18: # Consolidated Reporting
                rep = generate_consolidated_report(self.get_status(), self.results_cache)
                self.results_cache["report"] = rep
                result_data = rep
                st["summary"] = f"Consolidated DWDM report generated with PDF and JSON exports."

            st["status"] = "success"
        except Exception as e:
            logger.exception(f"Stage {stage_id} execution failed: {e}")
            st["status"] = "failed"
            error_msg = str(e)
            st["error"] = error_msg

        st["duration_sec"] = round(time.perf_counter() - t0, 3)
        st["completed_at"] = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

        # Persist job record in DB
        self._persist_job(stage_meta, st, params, error_msg)

        return {
            "stage_id": stage_id,
            "stage_name": stage_meta["stage_name"],
            "status": st["status"],
            "duration_sec": st["duration_sec"],
            "summary": st["summary"],
            "error": st["error"],
            "data": result_data
        }

    def _persist_job(self, stage_meta: Dict[str, Any], st: Dict[str, Any], params: Dict[str, Any], error: Optional[str]):
        try:
            Base.metadata.create_all(bind=engine)
            with SessionLocal() as db:
                job = JobExecution(
                    job_id=str(uuid.uuid4())[:12],
                    stage_id=stage_meta["stage_id"],
                    stage_name=stage_meta["stage_name"],
                    status=st["status"],
                    started_at=datetime.utcnow(),
                    completed_at=datetime.utcnow(),
                    duration_sec=st["duration_sec"],
                    parameters_json=json.dumps(params),
                    metrics_json=json.dumps({"summary": st["summary"]}) if st["summary"] else None,
                    error_message=error
                )
                db.add(job)
                db.commit()
        except Exception as e:
            logger.warning(f"Could not persist job record: {e}")

    def run_pipeline_background(self, stage_ids: Optional[List[int]] = None, params: Optional[Dict[str, Any]] = None):
        target_stages = stage_ids or [s["stage_id"] for s in STAGE_DEFINITIONS]

        def _worker():
            with self._lock:
                self.active_job_id = str(uuid.uuid4())[:8]
                self.pipeline_status = "running"

            all_ok = True
            for sid in target_stages:
                res = self.execute_stage(sid, params)
                if res["status"] == "failed":
                    all_ok = False
                    # Stop on critical failures in ETL/Ingestion
                    if sid in [1, 4, 6]:
                        break

            with self._lock:
                self.active_job_id = None
                self.pipeline_status = "completed" if all_ok else "partially_completed"

        t = threading.Thread(target=_worker, daemon=True)
        t.start()

orchestrator = PipelineOrchestrator()
