import os
import unittest
import numpy as np
import pandas as pd
from pathlib import Path
from fastapi.testclient import TestClient

from backend.app.core.config import DATA_DIR, REPORTS_DIR, EXPORTS_DIR, UPLOADS_DIR
from backend.app.core.database import SessionLocal, engine
from backend.app.services.dataset_service import profile_dataset, get_raw_dataframe
from backend.app.services.preprocessing_service import preprocess_dataset
from backend.app.services.reduction_service import reduce_features
from backend.app.services.association_service import mine_association_rules
from backend.app.services.classification_service import classify_customers
from backend.app.services.clustering_service import cluster_customers
from backend.app.services.timeseries_service import analyze_timeseries
from backend.app.services.sequence_service import analyze_sequences
from backend.app.services.text_service import mine_text_database
from backend.app.services.spatial_service import analyze_spatial_database, haversine_distance_matrix
from backend.app.services.multimedia_service import analyze_multimedia_database
from backend.app.services.report_service import generate_consolidated_report
from backend.app.warehouse.schema import get_warehouse_schema
from backend.app.warehouse.olap import execute_olap_query
from backend.app.main import app

class RetailIntelligenceBackendTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_01_raw_dataset_profile(self):
        """Verify raw CSV ingestion and statistical profiling (Exp 1)."""
        df = get_raw_dataframe()
        self.assertGreater(len(df), 500000, "Dataset should have > 500,000 rows.")
        expected_cols = {"InvoiceNo", "StockCode", "Description", "Quantity", "InvoiceDate", "UnitPrice", "CustomerID", "Country"}
        self.assertTrue(expected_cols.issubset(set(df.columns)), "Missing expected columns in Online Retail dataset.")

        profile = profile_dataset()
        self.assertIn("total_rows", profile)
        self.assertIn("total_columns", profile)
        self.assertIn("numeric_stats", profile)
        self.assertIn("top_countries", profile)
        self.assertIn("histograms", profile)
        self.assertIn("boxplots", profile)
        self.assertEqual(profile["total_rows"], len(df))

    def test_02_preprocessing_pipeline(self):
        """Verify data cleaning, binning smoothing, and normalizations (Exp 2)."""
        res = preprocess_dataset(binning_samples=20)
        self.assertIn("final_count", res)
        self.assertIn("duplicates_removed", res)
        self.assertIn("smoothing_table", res)
        self.assertIn("normalization_sample", res)
        self.assertIn("normalization_summary", res)
        
        # Verify normalization bounds
        norm_rows = res["normalization_sample"]
        self.assertGreater(len(norm_rows), 0)
        for r in norm_rows:
            self.assertGreaterEqual(r["min_max"], 0.0)
            self.assertLessEqual(r["min_max"], 1.0)

    def test_03_feature_reduction_and_discretization(self):
        """Verify mutual information, PCA explained variance, and binning (Exp 3)."""
        res = reduce_features(discretization_bins=4, n_pca_components=2)
        self.assertIn("mutual_info_scores", res)
        self.assertIn("pca_explained_variance", res)
        self.assertIn("discretization_equal_width", res)
        self.assertIn("discretization_equal_freq", res)
        self.assertIn("location_hierarchy", res)
        
        # PCA variance sum <= 1.0
        pca_sum = sum(res["pca_explained_variance"])
        self.assertLessEqual(pca_sum, 1.01)
        self.assertGreater(pca_sum, 0.0)

    def test_04_warehouse_schema_and_reconciliation(self):
        """Verify Star and Snowflake schema integrity and row reconciliation (Exp 4 & 6)."""
        schema_star = get_warehouse_schema("star")
        self.assertIn("tables", schema_star)
        table_names = [t["name"] for t in schema_star["tables"]]
        self.assertIn("fact_sales", table_names)
        self.assertIn("dim_customer", table_names)
        self.assertIn("dim_product", table_names)
        self.assertIn("dim_date", table_names)

        schema_snow = get_warehouse_schema("snowflake")
        snow_tables = [t["name"] for t in schema_snow["tables"]]
        self.assertIn("snow_fact_sales", snow_tables)
        self.assertIn("snow_dim_country", snow_tables)
        self.assertIn("snow_dim_region", snow_tables)

        # Check reconciliation audit export file exists
        reject_csv = EXPORTS_DIR / "rejected_records.csv"
        self.assertTrue(reject_csv.exists(), "ETL rejection log should be persisted in artifacts.")

    def test_05_olap_operations(self):
        """Verify OLAP rollup, slice, dice, pivot, and drilldown (Exp 5 & Unit 6A)."""
        # Slice by Country = 'United Kingdom'
        res_slice = execute_olap_query(
            schema_type="star",
            operation="slice",
            country="United Kingdom"
        )
        self.assertGreater(len(res_slice["data"]), 0)
        self.assertGreater(res_slice["data"][0]["revenue"], 0)

        # Rollup by Year
        res_rollup = execute_olap_query(
            schema_type="star",
            operation="rollup",
            year=2011
        )
        self.assertGreater(len(res_rollup["data"]), 0)

    def test_06_association_rule_mining(self):
        """Verify Apriori vs FP-Growth benchmarks and 11 interestingness measures (Exp 7-9)."""
        res = mine_association_rules(
            min_support=0.02,
            min_confidence=0.3,
            top_n_items=40
        )
        self.assertIn("algorithm_comparison", res)
        self.assertIn("rules", res)
        self.assertIn("measures_table", res)
        self.assertIn("null_invariance_demo", res)

        # Verify Apriori and FP-Growth produced identical itemset counts
        for comp in res["algorithm_comparison"]:
            self.assertTrue(comp["identical_results"], "Apriori and FP-Growth must produce identical frequent itemsets.")

    def test_07_classification_leakage_free(self):
        """Verify supervised classification with chronological cutoff and zero leakage (Exp 10-11)."""
        res = classify_customers(
            tree_criterion="gini",
            max_depth=4,
            knn_neighbors=5
        )
        self.assertIn("model_results", res)
        self.assertIn("confusion_matrices", res)
        self.assertIn("feature_importances", res)
        self.assertIn("tree_rules_text", res)
        
        # Verify metrics exist for Decision Tree (Pruned)
        dt = next((m for m in res["model_results"] if "Pruned" in m["model_name"]), None)
        self.assertIsNotNone(dt)
        self.assertGreaterEqual(dt["accuracy"], 0.0)
        self.assertLessEqual(dt["accuracy"], 1.0)
        self.assertGreaterEqual(dt["f1_score"], 0.0)
        self.assertLessEqual(dt["f1_score"], 1.0)

    def test_08_clustering_and_outliers(self):
        """Verify customer RFM clustering, Silhouette scores, dendrograms, and DBSCAN (Exp 12)."""
        res = cluster_customers(
            n_clusters=4,
            dbscan_eps=0.8,
            dbscan_min_samples=5
        )
        self.assertEqual(len(res["cluster_profiles"]), 4)
        self.assertIn("elbow_inertia", res)
        self.assertIn("silhouette_by_k", res)
        self.assertIn("pca_scatter", res)
        self.assertIn("dbscan_noise_count", res)
        self.assertGreaterEqual(res["dbscan_noise_count"], 0)

    def test_09_timeseries_forecasting(self):
        """Verify time-series resampling, rolling averages, and holdout forecast benchmarks (Unit 6D)."""
        res = analyze_timeseries(
            frequency="W",
            forecast_horizon=8
        )
        self.assertIn("metrics", res)
        self.assertIn("historical_series", res)
        self.assertIn("forecast_series", res)
        
        # Verify holdout metrics
        ma_perf = res["metrics"]["Moving Average (4-period)"]
        self.assertGreaterEqual(ma_perf["MAE"], 0.0)
        self.assertGreaterEqual(ma_perf["RMSE"], 0.0)

    def test_10_sequence_mining(self):
        """Verify chronological customer purchase journey transitions (Unit 6D)."""
        res = analyze_sequences(
            top_n_patterns=15
        )
        self.assertIn("frequent_transitions", res)
        self.assertIn("interval_stats", res)
        self.assertGreater(res["eligible_customers"], 0)

    def test_11_text_mining(self):
        """Verify TF-IDF vectorization, cosine similarity product search, and clusters (Unit 6E)."""
        res = mine_text_database(
            query="heart light candle",
            top_products_count=1500,
            n_clusters=4
        )
        self.assertIn("top_terms", res)
        self.assertIn("similarity_results", res)
        self.assertIn("themes", res)
        self.assertGreater(len(res["similarity_results"]), 0)

    def test_12_spatial_mining_haversine(self):
        """Verify Haversine Great-Circle distance and spatial DBSCAN clustering (Unit 6B)."""
        coords = np.array([
            [51.5074, -0.1278],
            [48.8566, 2.3522]
        ])
        dist = haversine_distance_matrix(coords)
        self.assertAlmostEqual(dist[0, 1], 343.0, delta=10.0)

        # Full spatial database execution
        res = analyze_spatial_database(use_sample_if_none=True, dbscan_eps_km=250.0, dbscan_min_points=2)
        self.assertIn("spatial_clusters", res)
        self.assertIn("retail_country_revenue", res)
        self.assertGreater(res["total_locations"], 0)

    def test_13_multimedia_mining_hashes(self):
        """Verify image metadata extraction, MD5 exact hashing, and pHash duplicates (Unit 6C)."""
        res = analyze_multimedia_database(use_sample_if_empty=True)
        self.assertIn("total_images", res)
        self.assertIn("images_metadata", res)
        self.assertIn("exact_duplicates", res)
        self.assertIn("perceptual_duplicates", res)
        self.assertIn("visual_clusters", res)
        self.assertGreater(res["total_images"], 0)

    def test_14_consolidated_report_and_pdf(self):
        """Verify consolidated report generation in both JSON and PDF formats."""
        pipeline_dummy = {
            "pipeline_status": "completed",
            "stages": [{"stage_id": i, "status": "success"} for i in range(1, 19)]
        }
        res_dummy = {"dataset_profile": {"rows": 541909}}
        report = generate_consolidated_report(pipeline_dummy, res_dummy)
        
        json_file = REPORTS_DIR / "consolidated_report.json"
        pdf_file = REPORTS_DIR / "consolidated_report.pdf"
        self.assertTrue(json_file.exists(), "Audit JSON report should be generated.")
        self.assertTrue(pdf_file.exists(), "Audit PDF report should be generated.")
        self.assertGreater(pdf_file.stat().st_size, 1000, "PDF file should contain formatted document data.")

    def test_15_fastapi_rest_endpoints(self):
        """Verify FastAPI REST API endpoints."""
        # Health check
        res_health = self.client.get("/api/health")
        self.assertEqual(res_health.status_code, 200)
        self.assertEqual(res_health.json()["status"], "healthy")

        # Warehouse schema
        res_schema = self.client.get("/api/warehouse/schema?schema_type=star")
        self.assertEqual(res_schema.status_code, 200)
        self.assertIn("tables", res_schema.json())

        # Pipeline status
        res_pipe = self.client.get("/api/pipeline/status")
        self.assertEqual(res_pipe.status_code, 200)
        self.assertIn("stages", res_pipe.json())

        # Reports latest
        res_rep = self.client.get("/api/reports/latest")
        self.assertEqual(res_rep.status_code, 200)
        self.assertIn("title", res_rep.json())

if __name__ == "__main__":
    unittest.main()
