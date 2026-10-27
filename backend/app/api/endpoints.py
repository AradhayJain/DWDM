import os
import json
import shutil
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from backend.app.core.config import UPLOADS_DIR, REPORTS_DIR, EXPORTS_DIR, get_default_csv_path
from backend.app.schemas.schemas import (
    DatasetProfileResponse, PreprocessingRequest, PreprocessingResponse,
    ReductionRequest, ReductionResponse, WarehouseSchemaResponse,
    OlapQueryRequest, OlapQueryResponse, AssociationRulesRequest, AssociationRulesResponse,
    ClassificationRequest, ClassificationResponse, ClusteringRequest, ClusteringResponse,
    TimeSeriesRequest, TimeSeriesResponse, SequenceRequest, SequenceResponse,
    TextMiningRequest, TextMiningResponse, SpatialAnalyzeRequest, SpatialAnalyzeResponse,
    MultimediaAnalyzeRequest, MultimediaAnalyzeResponse, PipelineStatusResponse
)
from backend.app.services.dataset_service import profile_dataset, get_raw_dataframe
from backend.app.services.preprocessing_service import preprocess_dataset
from backend.app.services.reduction_service import reduce_features
from backend.app.warehouse.schema import get_warehouse_schema
from backend.app.warehouse.loader import run_etl_pipeline
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
from backend.app.pipeline.orchestrator import orchestrator, STAGE_DEFINITIONS

router = APIRouter()

# ==========================================
# HEALTH & OVERVIEW
# ==========================================

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Retail Intelligence Lab API",
        "warehouse": "sqlite",
        "csv_source": str(get_default_csv_path()),
        "csv_exists": get_default_csv_path().exists()
    }

@router.get("/overview")
def get_overview_metrics():
    """Returns top-level business intelligence metrics from the dataset and warehouse."""
    df = get_raw_dataframe()
    total_raw = len(df)
    cancelled = int(df["InvoiceNo"].astype(str).str.startswith("C").sum())
    valid_sales = df[~df["InvoiceNo"].astype(str).str.startswith("C") & (df["Quantity"] > 0) & (df["UnitPrice"] > 0)]
    revenue = round(float((valid_sales["Quantity"] * valid_sales["UnitPrice"]).sum()), 2)
    invoices = int(valid_sales["InvoiceNo"].nunique())
    customers = int(valid_sales["CustomerID"].dropna().nunique())
    products = int(valid_sales["StockCode"].nunique())
    countries = int(valid_sales["Country"].nunique())

    # Quick country summary
    country_rev = (
        valid_sales.assign(rev=valid_sales["Quantity"] * valid_sales["UnitPrice"])
        .groupby("Country")["rev"]
        .sum()
        .sort_values(ascending=False)
        .head(6)
    )
    top_countries = [{"country": k, "revenue": round(float(v), 2)} for k, v in country_rev.items()]

    # Quick monthly revenue trend
    monthly = (
        valid_sales.assign(rev=valid_sales["Quantity"] * valid_sales["UnitPrice"])
        .set_index("InvoiceDate")
        .resample("M")["rev"]
        .sum()
    )
    revenue_trend = [
        {"month": d.strftime("%b %Y"), "revenue": round(float(v), 2)}
        for d, v in monthly.items()
    ]

    return {
        "raw_records": total_raw,
        "clean_records": len(valid_sales),
        "cancelled_records": cancelled,
        "total_revenue": revenue,
        "total_invoices": invoices,
        "known_customers": customers,
        "unique_products": products,
        "countries_count": countries,
        "top_countries": top_countries,
        "revenue_trend": revenue_trend,
        "pipeline_status": orchestrator.get_status()["pipeline_status"]
    }

# ==========================================
# DATASET
# ==========================================

@router.get("/dataset/profile", response_model=DatasetProfileResponse)
def get_dataset_profile(csv_path: Optional[str] = None):
    try:
        return profile_dataset(csv_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/dataset/upload")
async def upload_dataset(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
    target_path = UPLOADS_DIR / file.filename
    with open(target_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    profile = profile_dataset(str(target_path))
    return {
        "filename": file.filename,
        "path": str(target_path),
        "total_rows": profile["total_rows"],
        "columns": profile["columns"]
    }

# ==========================================
# PREPROCESSING & REDUCTION
# ==========================================

@router.post("/preprocessing/run", response_model=PreprocessingResponse)
def run_preprocessing(req: PreprocessingRequest):
    try:
        return preprocess_dataset(
            impute_description=req.impute_description,
            guest_customer_handling=req.guest_customer_handling,
            remove_duplicates=req.remove_duplicates,
            remove_cancellations=req.remove_cancellations,
            remove_invalid_prices=req.remove_invalid_prices,
            binning_feature=req.binning_feature,
            binning_samples=req.binning_samples,
            normalization_feature=req.normalization_feature
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/reduction/run", response_model=ReductionResponse)
def run_reduction(req: ReductionRequest):
    try:
        return reduce_features(
            cutoff_date=req.cutoff_date,
            discretization_bins=req.discretization_bins,
            n_pca_components=req.n_pca_components,
            rfe_features=req.rfe_features
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==========================================
# WAREHOUSE, ETL & OLAP
# ==========================================

@router.get("/warehouse/schema", response_model=WarehouseSchemaResponse)
def get_schema(schema_type: str = Query("star", pattern="^(star|snowflake)$")):
    try:
        return get_warehouse_schema(schema_type)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/warehouse/etl/run")
def run_etl(csv_path: Optional[str] = None):
    try:
        return run_etl_pipeline(csv_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/olap/query", response_model=OlapQueryResponse)
def run_olap_query(req: OlapQueryRequest):
    try:
        return execute_olap_query(
            operation=req.operation,
            schema_type=req.schema_type,
            year=req.year,
            quarter=req.quarter,
            month=req.month,
            country=req.country,
            countries=req.countries,
            price_bands=req.price_bands,
            row_dimension=req.row_dimension,
            col_dimension=req.col_dimension,
            metric=req.metric
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==========================================
# DATA MINING EXPERIMENTS
# ==========================================

@router.post("/association/mine", response_model=AssociationRulesResponse)
def run_association(req: AssociationRulesRequest):
    try:
        return mine_association_rules(
            country=req.country,
            min_support=req.min_support,
            min_confidence=req.min_confidence,
            top_n_items=req.top_n_items,
            compare_algorithms=req.compare_algorithms
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/classification/train", response_model=ClassificationResponse)
def run_classification(req: ClassificationRequest):
    try:
        return classify_customers(
            cutoff_date=req.cutoff_date,
            algorithm=req.algorithm,
            tree_criterion=req.tree_criterion,
            max_depth=req.max_depth,
            ccp_alpha=req.ccp_alpha,
            knn_neighbors=req.knn_neighbors
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/clustering/run", response_model=ClusteringResponse)
def run_clustering(req: ClusteringRequest):
    try:
        return cluster_customers(
            cutoff_date=req.cutoff_date,
            n_clusters=req.n_clusters,
            dbscan_eps=req.dbscan_eps,
            dbscan_min_samples=req.dbscan_min_samples
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==========================================
# UNIT 6: COMPLEX DATA MINING
# ==========================================

@router.post("/timeseries/analyze", response_model=TimeSeriesResponse)
def run_timeseries(req: TimeSeriesRequest):
    try:
        return analyze_timeseries(
            frequency=req.frequency,
            forecast_horizon=req.forecast_horizon
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/sequences/analyze", response_model=SequenceResponse)
def run_sequences(req: SequenceRequest):
    try:
        return analyze_sequences(
            min_purchases=req.min_purchases,
            top_n_patterns=req.top_n_patterns
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/text/analyze", response_model=TextMiningResponse)
def run_text(req: TextMiningRequest):
    try:
        return mine_text_database(
            query=req.query,
            top_products_count=req.top_products_count,
            n_clusters=req.n_clusters,
            min_df=req.min_df
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/spatial/analyze", response_model=SpatialAnalyzeResponse)
def run_spatial(req: SpatialAnalyzeRequest):
    try:
        return analyze_spatial_database(
            use_sample_if_none=req.use_sample_if_none,
            dbscan_eps_km=req.dbscan_eps_km,
            dbscan_min_points=req.dbscan_min_points
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/spatial/upload")
async def upload_spatial_file(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV spatial files allowed.")
    target = UPLOADS_DIR / file.filename
    with open(target, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return analyze_spatial_database(spatial_csv_path=str(target))

@router.post("/multimedia/analyze", response_model=MultimediaAnalyzeResponse)
def run_multimedia(req: MultimediaAnalyzeRequest):
    try:
        return analyze_multimedia_database(use_sample_if_empty=req.use_sample_if_empty)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/multimedia/upload")
async def upload_images(files: List[UploadFile] = File(...)):
    saved = []
    for f in files:
        target = UPLOADS_DIR / f.filename
        with open(target, "wb") as buf:
            shutil.copyfileobj(f.file, buf)
        saved.append(f.filename)
    return analyze_multimedia_database(custom_dir=str(UPLOADS_DIR))

# ==========================================
# PIPELINE ORCHESTRATOR
# ==========================================

@router.get("/pipeline/status", response_model=PipelineStatusResponse)
def get_pipeline_status():
    return orchestrator.get_status()

@router.post("/pipeline/run")
def run_full_pipeline(background: bool = True):
    if background:
        orchestrator.run_pipeline_background()
        return {"message": "Pipeline execution started in background.", "status": orchestrator.get_status()}
    else:
        for s in STAGE_DEFINITIONS:
            orchestrator.execute_stage(s["stage_id"])
        return orchestrator.get_status()

@router.post("/pipeline/stages/{stage_id}/run")
def run_stage(stage_id: int):
    res = orchestrator.execute_stage(stage_id)
    return res

@router.get("/experiments")
def list_experiments():
    return [
        {"id": 1, "unit": "Unit 1", "title": "Dataset Exploration & Visual Profiling", "endpoint": "/api/dataset/profile"},
        {"id": 2, "unit": "Unit 2", "title": "Data Preprocessing & Normalization", "endpoint": "/api/preprocessing/run"},
        {"id": 3, "unit": "Unit 2", "title": "Feature Reduction & Discretization", "endpoint": "/api/reduction/run"},
        {"id": 4, "unit": "Unit 3", "title": "Star & Snowflake Schema Warehouse Design", "endpoint": "/api/warehouse/schema"},
        {"id": 5, "unit": "Unit 3", "title": "OLAP Operations (Roll-up, Drill-down, Slice, Dice, Pivot, Cube)", "endpoint": "/api/olap/query"},
        {"id": 6, "unit": "Unit 3", "title": "ETL Pipeline & Data Reconciliation", "endpoint": "/api/warehouse/etl/run"},
        {"id": 7, "unit": "Unit 4", "title": "Market Basket Analysis with Apriori", "endpoint": "/api/association/mine"},
        {"id": 8, "unit": "Unit 4", "title": "Apriori vs FP-Growth Performance Benchmark", "endpoint": "/api/association/mine"},
        {"id": 9, "unit": "Unit 4", "title": "Correlation Analysis & 11 Association Measures", "endpoint": "/api/association/mine"},
        {"id": 10, "unit": "Unit 5", "title": "Decision Tree Classification & Pruning", "endpoint": "/api/classification/train"},
        {"id": 11, "unit": "Unit 5", "title": "Naive Bayes & kNN Model Comparison", "endpoint": "/api/classification/train"},
        {"id": 12, "unit": "Unit 5", "title": "K-Means, Ward Hierarchical & DBSCAN Outlier Detection", "endpoint": "/api/clustering/run"},
    ]

# ==========================================
# REPORTS & EXPORTS
# ==========================================

@router.get("/reports/latest")
def get_latest_report():
    report_file = REPORTS_DIR / "consolidated_report.json"
    if not report_file.exists():
        # Generate on the fly
        return generate_consolidated_report(orchestrator.get_status(), orchestrator.results_cache)
    with open(report_file) as f:
        return json.load(f)

@router.get("/reports/download/pdf")
def download_pdf_report():
    pdf_file = REPORTS_DIR / "consolidated_report.pdf"
    if not pdf_file.exists():
        generate_consolidated_report(orchestrator.get_status(), orchestrator.results_cache)
    if not pdf_file.exists():
        raise HTTPException(status_code=404, detail="PDF report not found.")
    return FileResponse(pdf_file, media_type="application/pdf", filename="Retail_Intelligence_Lab_Report.pdf")

@router.get("/reports/download/json")
def download_json_report():
    json_file = REPORTS_DIR / "consolidated_report.json"
    if not json_file.exists():
        generate_consolidated_report(orchestrator.get_status(), orchestrator.results_cache)
    return FileResponse(json_file, media_type="application/json", filename="Retail_Intelligence_Lab_Report.json")

@router.get("/reports/download/etl-rejects")
def download_etl_rejects():
    rej_file = EXPORTS_DIR / "rejected_records.csv"
    if not rej_file.exists():
        raise HTTPException(status_code=404, detail="No rejected records file. Please run the ETL pipeline first.")
    return FileResponse(rej_file, media_type="text/csv", filename="rejected_records.csv")
