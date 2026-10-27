# Retail Intelligence Lab
## End-to-End Data Warehouse and Data Mining Platform
**Course:** DTU SE425 — Data Warehouse and Data Mining  
**Mini-Project Implementation & Practical Laboratory Suite**

---

## 1. Project Objective

**Retail Intelligence Lab** is an enterprise-grade, full-stack Data Warehouse and Data Mining web platform built to demonstrate a complete, rigorous end-to-end analytics workflow on real retail transaction data (`Online Retail.csv` with 541,909 records).

The system seamlessly executes every stage of the knowledge discovery in databases (KDD) process:
$$\text{CSV Ingestion} \longrightarrow \text{Profiling} \longrightarrow \text{Preprocessing} \longrightarrow \text{Feature Reduction} \longrightarrow \text{ETL} \longrightarrow \text{Warehouse (Star/Snowflake)} \longrightarrow \text{OLAP} \longrightarrow \text{Data Mining (Rules, Classification, Clustering)} \longrightarrow \text{Unit 6 Complex Mining} \longrightarrow \text{Consolidated Audit}$$

### Academic Rigor & Authenticity Guarantees
- **No Mock Metrics or Synthetic Hardcoding:** Every metric, chart, and table in the UI is backed by real mathematical algorithms executed locally via Python, Scikit-learn, mlxtend, and SQLite.
- **Zero Target Leakage:** Supervised classification and customer modeling enforce strict chronological cutoffs (`2011-09-01`), guaranteeing features are derived exclusively from historical transaction windows.
- **Zero External Paid Dependencies:** Requires no cloud subscriptions, OpenAI tokens, or external servers. The local SQLite warehouse and FastAPI backend run fully offline for instant grading.

---

## 2. Technology Stack

### Frontend
- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Vanilla CSS + Tailwind CSS 3 (neutral slate aesthetic, dark typography, indigo/blue accents)
- **Routing:** React Router DOM (v6)
- **Charts:** Recharts (responsive bar charts, scatter plots, line charts, area charts)
- **Icons:** Lucide React

### Backend
- **Engine:** Python 3.12 + FastAPI + Uvicorn
- **Data Engineering:** Pandas, NumPy, SciPy
- **Data Mining & ML:** Scikit-learn, mlxtend (Apriori & FP-Growth)
- **Multimedia:** Pillow, ImageHash (pHash / dHash)
- **Reporting:** ReportLab (Official PDF compilation)
- **Database ORM:** SQLAlchemy 2.0 with SQLite in Write-Ahead Logging (WAL) mode

---

## 3. Syllabus Coverage Matrix (DTU SE425)

| Practical Exp | Syllabus Unit | Topic | Algorithm / Mathematical Implementation | Frontend Route |
|---|---|---|---|---|
| **Exp 1** | Unit 1 & 2 | Dataset Exploration & Profiling | Univariate stats, interquartile boxplots, log10 frequency histograms | `/data-explorer` |
| **Exp 2** | Unit 2 | Data Preprocessing | Imputation, duplicate filtering, binning smoothing (mean/median/boundary), Min-Max / Z-score / Decimal scaling | `/preprocessing` |
| **Exp 3** | Unit 2 | Data Reduction & Discretization | Mutual Information ranking, PCA dimensionality reduction, Equal-Width & Equal-Frequency binning, concept hierarchies | `/reduction` |
| **Exp 4** | Unit 3 | Warehouse Schemas | Relational Star Schema (`fact_sales`) & Snowflake Schema (`snow_dim_region`, `snow_dim_country`) with foreign key constraints | `/warehouse` |
| **Exp 5** | Unit 3 | OLAP Operations | Slicing, Dicing, Roll-up, Drill-down, and Cross-Tabulation Pivot queries | `/olap` |
| **Exp 6** | Unit 3 | ETL Pipeline & Reconciliation | Raw transaction cleaning, regional enrichment, rejection logging (`rejected_records.csv`), and row-count reconciliation | `/etl` |
| **Exp 7–9** | Unit 4 | Association Rule Mining | Apriori vs. FP-Growth benchmarks, 11 interestingness measures (Support, Confidence, Lift, Leverage, Conviction, $\chi^2$, Cosine, Kulczynski), and null-invariance proofs | `/association` |
| **Exp 10–11** | Unit 5 | Supervised Classification | Decision Tree (Gini/Entropy, cost-complexity pruning, rules export), Naive Bayes, k-NN, 10-fold Cross-Validation, ROC/AUC | `/classification` |
| **Exp 12** | Unit 5 | Clustering & Outlier Detection | Customer RFM feature engineering, Elbow SSE, Silhouette curve, Ward hierarchical dendrogram, PCA 2D projections, DBSCAN noise outliers | `/clustering` |
| **Unit 6A** | Unit 6 | Multidimensional Analysis | Multi-cube aggregations across time, country, product, and customer dimensions | `/unit6` & `/olap` |
| **Unit 6B** | Unit 6 | Spatial Database Mining | Retail country revenue distribution + Coordinate GPS validation, Great-Circle Haversine distance, and Spatial DBSCAN clustering | `/unit6/spatial` |
| **Unit 6C** | Unit 6 | Multimedia Image Mining | Image metadata extraction, MD5 exact byte duplicate detection, DCT Perceptual Hashing (pHash Hamming distance $\le 6$), RGB color histogram K-Means clustering | `/unit6/multimedia` |
| **Unit 6D** | Unit 6 | Time-Series & Sequence Mining | Weekly/Monthly resampling, rolling averages, holdout forecasts (Naive, Moving Average, Linear Trend), customer purchase journey transitions | `/timeseries` & `/sequences` |
| **Unit 6E** | Unit 6 | Text Database Mining | N-gram tokenization, TF-IDF vectorization, Cosine similarity product search, description keyword theme clustering | `/text-mining` |
| **Unit 6F** | Unit 6 | Applications & Trends | 7 practical retail business problem mappings + educational discussion on scalable MPP mining, streaming data algorithms, and responsible AI governance | `/unit6/applications-trends` |

---

## 4. Architecture and Directory Structure

```text
DWDM/
├── Online Retail.csv               # Primary transactional dataset (541,909 rows)
├── requirements.txt                # Python backend dependencies
├── .env.example                    # Environment variable template
├── run.sh                          # Linux/macOS one-click startup runner
├── run.bat                         # Windows one-click startup runner
│
├── backend/                        # FastAPI Backend Application
│   └── app/
│       ├── main.py                 # FastAPI app entrypoint, CORS & lifespan
│       ├── core/
│       │   ├── config.py           # Paths, dataset discovery, and constants
│       │   └── database.py         # SQLite engine (WAL mode + foreign key pragmas)
│       ├── models/
│       │   └── warehouse.py        # SQLAlchemy Star and Snowflake schema ORM
│       ├── schemas/
│       │   └── schemas.py          # Pydantic request & response validation schemas
│       ├── warehouse/
│       │   ├── loader.py           # Exp 6: ETL pipeline & reconciliation audit
│       │   ├── schema.py           # Exp 4: Star & Snowflake schema inspector
│       │   └── olap.py             # Exp 5 / 6A: OLAP query execution engine
│       ├── services/               # Core data mining mathematical services
│       │   ├── dataset_service.py        # Exp 1: Profiling & histograms
│       │   ├── preprocessing_service.py  # Exp 2: Cleaning & normalization
│       │   ├── reduction_service.py      # Exp 3: PCA & discretization
│       │   ├── association_service.py    # Exp 7-9: Apriori vs FP-Growth
│       │   ├── classification_service.py # Exp 10-11: Decision Tree, NB, kNN
│       │   ├── clustering_service.py     # Exp 12: RFM K-Means & DBSCAN
│       │   ├── timeseries_service.py     # Unit 6D: Forecasting & holdouts
│       │   ├── sequence_service.py       # Unit 6D: Sequential transitions
│       │   ├── text_service.py           # Unit 6E: TF-IDF & similarity
│       │   ├── spatial_service.py        # Unit 6B: Haversine & spatial DBSCAN
│       │   ├── multimedia_service.py     # Unit 6C: Image metadata & pHash
│       │   └── report_service.py         # Consolidated audit & ReportLab PDF
│       ├── pipeline/
│       │   └── orchestrator.py     # Thread-safe 18-stage background orchestrator
│       └── api/
│           └── endpoints.py        # Complete REST API routes
│
├── frontend/                       # React 18 + TypeScript + Vite Dashboard
│   ├── src/
│   │   ├── main.tsx                # React DOM root entrypoint
│   │   ├── App.tsx                 # Route declarations for all 20 pages
│   │   ├── api/client.ts           # Type-safe API fetch client
│   │   ├── types/index.ts          # Comprehensive TypeScript interface types
│   │   ├── layouts/
│   │   │   └── DashboardLayout.tsx # Responsive sidebar and top navbar layout
│   │   ├── components/
│   │   │   ├── MetricCard.tsx      # Standardized analytics KPI card
│   │   │   ├── StatusBadge.tsx     # Stage execution state badge
│   │   │   ├── DataTable.tsx       # Paginated, searchable, exportable table
│   │   │   ├── Sidebar.tsx         # Collapsible navigation drawer
│   │   │   └── Navbar.tsx          # Status indicators and breadcrumbs
│   │   └── pages/                  # 20 Functional interactive lab pages
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── data/                           # Data directory
│   ├── Online Retail.csv           # Symlinked raw CSV
│   ├── country_region.json         # Geographical enrichment dictionary
│   ├── sample_spatial_retail.csv   # GPS coordinate retail sample for Unit 6B
│   ├── sample_images/              # Product image samples for Unit 6C
│   └── retail_dw.db                # SQLite Data Warehouse (522,568 rows)
│
├── artifacts/                      # Execution outputs & persistence
│   ├── exports/rejected_records.csv# ETL audit of filtered/non-positive rows
│   ├── reports/consolidated_report.json # Full academic audit JSON
│   ├── reports/consolidated_report.pdf  # Downloadable PDF audit report
│   └── uploads/                    # User-uploaded CSV and image files
│
└── tests/
    └── test_backend.py             # 15 Automated unit & integration tests
```

---

## 5. Quick Startup Instructions

### Option A: One-Click Startup (Recommended)

#### On Linux / macOS:
```bash
chmod +x run.sh
./run.sh
```

#### On Windows:
Double-click `run.bat` or run:
```cmd
run.bat
```

The script automatically:
1. Verifies/creates the Python virtual environment (`.venv`).
2. Checks for `Online Retail.csv`.
3. Populates the SQLite Data Warehouse (`data/retail_dw.db`) if not already present.
4. Starts the **FastAPI Backend** on `http://127.0.0.1:8000`.
5. Starts the **React Frontend** on `http://127.0.0.1:5173`.

---

### Option B: Manual Step-by-Step Startup

#### 1. Backend Setup
```bash
# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run ETL once to initialize and populate the SQLite Data Warehouse (takes ~4s)
python -c "from backend.app.warehouse.loader import run_etl_pipeline; run_etl_pipeline()"

# Start the FastAPI server
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
- Interactive Swagger documentation: **`http://127.0.0.1:8000/docs`**
- Health check endpoint: **`http://127.0.0.1:8000/api/health`**

#### 2. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
Open **`http://127.0.0.1:5173`** in your browser.

---

## 6. Running the Automated Test Suite

The test suite thoroughly validates every mathematical service, ETL reconciliation, model metric, and REST endpoint on the real dataset:

```bash
# Run all 15 automated tests
.venv/bin/python -m unittest tests/test_backend.py
```

### Verified Test Areas:
1. **`test_01_raw_dataset_profile`**: Raw CSV ingestion, dimensions (541,909 rows), attribute kinds, missing rates, and numeric statistics.
2. **`test_02_preprocessing_pipeline`**: Duplicate removal, cancellation filtering, smoothing, and min-max/z-score/decimal scaling.
3. **`test_03_feature_reduction_and_discretization`**: Mutual information ranking, PCA explained variance ($\le 1.0$), and equal-width/equal-frequency binning.
4. **`test_04_warehouse_schema_and_reconciliation`**: Star and Snowflake schema referential integrity, foreign keys, and ETL rejection log persistence.
5. **`test_05_olap_operations`**: OLAP Slicing on UK sales, dicing across dimensions, and temporal rollups.
6. **`test_06_association_rule_mining`**: Apriori vs. FP-Growth exact itemset equivalence, 11 interestingness measures, and null-invariance proof.
7. **`test_07_classification_leakage_free`**: Chronological cutoff date (`2011-09-01`), Decision Tree (pruned rules text), Naive Bayes, k-NN, 10-fold CV, and confusion matrices.
8. **`test_08_clustering_and_outliers`**: Customer RFM log scaling, optimal $k=4$ selection via Elbow and Silhouette analysis, PCA 2D coordinates, and DBSCAN density outliers.
9. **`test_09_timeseries_forecasting`**: Weekly sales resampling, rolling statistics, holdout forecast benchmarks (Naive, Moving Average, Linear Trend), MAE, RMSE, and MAPE metrics.
10. **`test_10_sequence_mining`**: Chronological purchase journeys, sequential item transition probabilities, and inter-purchase interval cycles.
11. **`test_11_text_mining`**: Tokenization, TF-IDF vectorization, cosine similarity product search, and description keyword themes.
12. **`test_12_spatial_mining_haversine`**: Spherical Haversine Great-Circle distance calculation and spatial DBSCAN clustering.
13. **`test_13_multimedia_mining_hashes`**: Image metadata extraction, MD5 exact hashing, DCT pHash perceptual duplicates (Hamming distance $\le 6$), and RGB color clustering.
14. **`test_14_consolidated_report_and_pdf`**: Generation of official audit JSON and ReportLab PDF document.
15. **`test_15_fastapi_rest_endpoints`**: Live REST API routing, status responses, and schema serialization.

---

## 7. Data Warehouse Design & Reconciliation

### Star Schema
- **Fact Table:** `fact_sales` (Grain: Individual invoice line item)
  - Measures: `quantity`, `unit_price`, `revenue` ($Quantity \times UnitPrice$)
  - Dimension Keys: `customer_key` $\to$ `dim_customer`, `product_key` $\to$ `dim_product`, `date_key` $\to$ `dim_date`
  - Attributes: `invoice_no`, `country`
- **Dimension Tables:**
  - `dim_date`: `date_key`, `full_date`, `day`, `month`, `year`, `quarter`, `day_of_week`, `is_weekend`
  - `dim_customer`: `customer_key`, `customer_id`, `country`
  - `dim_product`: `product_key`, `stock_code`, `description`, `price_band`

### Snowflake Schema
- Normalizes country geography and product pricing tiers into separate normalized dimensions:
  - `snow_fact_sales` $\longrightarrow$ `snow_dim_customer` $\longrightarrow$ `snow_dim_country` $\longrightarrow$ `snow_dim_region`
  - `snow_fact_sales` $\longrightarrow$ `snow_dim_product` $\longrightarrow$ `snow_dim_price_band`

### ETL Reconciliation Audit Numbers
- **Raw CSV Extracted:** `541,909` rows
- **Invalid Records Filtered:** `19,341` rows
  - Cancelled Invoices ($InvoiceNo$ starting with 'C'): `9,288`
  - Non-positive Quantities or Zero/Negative Unit Prices: `4,785`
  - Exact In-file Duplicates: `5,268`
- **Warehouse Loaded Fact Records:** `522,568` rows
- **Reconciled DW Total Revenue:** **`£10,247,905.13`**
- **Reconciliation Audit Check:** `True` (Balanced and logged to `artifacts/exports/rejected_records.csv`)

---

## 8. Downloads and Audit Artifacts

The platform provides direct downloads for external auditing:
1. **Consolidated PDF Report:** Downloadable via `GET /api/reports/download/pdf` (formatted multi-page academic report with executive summary, tables, and Unit 6 matrix).
2. **Audit JSON Report:** Downloadable via `GET /api/reports/download/json`.
3. **ETL Rejections CSV:** Downloadable via `GET /api/reports/download/etl-rejects`.
4. **Data Tables:** All tables in the React UI support one-click CSV export.

---

## 9. Academic Coursework Disclosures

- **Dataset:** Online Retail dataset from the UCI Machine Learning Repository (Transnational sales records between 01/12/2010 and 09/12/2011 for a UK-based non-store retail corporation).
- **Institution:** Delhi Technological University (DTU)
- **Subject Code:** SE425 (Data Warehouse and Data Mining)
- **Syllabus Units Covered:** Unit 1 (Introduction), Unit 2 (Data Preprocessing), Unit 3 (Data Warehouse & OLAP), Unit 4 (Association Mining), Unit 5 (Classification & Clustering), Unit 6 (Complex Data Mining & Applications).
