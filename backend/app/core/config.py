import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = BASE_DIR / "data"
ARTIFACTS_DIR = BASE_DIR / "artifacts"
REPORTS_DIR = ARTIFACTS_DIR / "reports"
EXPORTS_DIR = ARTIFACTS_DIR / "exports"
UPLOADS_DIR = ARTIFACTS_DIR / "uploads"

DATA_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_CSV_CANDIDATES = [
    DATA_DIR / "Online Retail.csv",
    DATA_DIR / "Online_Retail.csv",
    BASE_DIR / "Online Retail.csv",
    BASE_DIR / "Online_Retail.csv",
    BASE_DIR / "dwdm_lab" / "Online_Retail.csv",
    BASE_DIR / "dwdm_lab" / "Online Retail.csv",
]

def get_default_csv_path() -> Path:
    for candidate in DEFAULT_CSV_CANDIDATES:
        if candidate.exists() and candidate.is_file():
            return candidate
    return DEFAULT_CSV_CANDIDATES[0]

DB_PATH = DATA_DIR / "retail_dw.db"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")

PROJECT_TITLE = "Retail Intelligence Lab"
PROJECT_SUBTITLE = "End-to-End Data Warehouse and Mining Platform — DTU SE425"
VERSION = "1.0.0"
API_PREFIX = "/api"
