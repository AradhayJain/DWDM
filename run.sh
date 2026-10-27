#!/usr/bin/env bash
# ==============================================================================
# RETAIL INTELLIGENCE LAB — STARTUP RUNNER
# DTU SE425 Data Warehouse and Data Mining Mini-Project
# ==============================================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "=========================================================================="
echo "  Retail Intelligence Lab — DTU SE425 DWDM Mini-Project"
echo "  Full-Stack Data Warehouse & Data Mining Platform"
echo "=========================================================================="

# 1. Check Python Virtual Environment
VENV_DIR="$PROJECT_ROOT/.venv"
if [ ! -d "$VENV_DIR" ]; then
    echo "[!] Virtual environment not found at .venv. Creating..."
    python3 -m venv .venv
    .venv/bin/pip install --upgrade pip
    .venv/bin/pip install -r requirements.txt
fi

PYTHON="$VENV_DIR/bin/python"

# 2. Check Dataset
if [ ! -f "Online Retail.csv" ] && [ ! -f "data/Online Retail.csv" ]; then
    echo "[!] Warning: Online Retail.csv not found in root or data/ directory."
else
    echo "[✓] Online Retail dataset verified."
fi

# 3. Check / Populate SQLite Warehouse
if [ ! -f "data/retail_dw.db" ]; then
    echo "[*] Initializing and populating SQLite Data Warehouse (Star & Snowflake schemas)..."
    "$PYTHON" -c "from backend.app.warehouse.loader import run_etl_pipeline; res = run_etl_pipeline(); print('Loaded rows:', res['fact_sales_loaded'])"
    echo "[✓] Warehouse populated successfully."
else
    echo "[✓] SQLite Data Warehouse verified."
fi

# 4. Check Frontend Node Modules
if [ ! -d "frontend/node_modules" ]; then
    echo "[*] Installing frontend npm dependencies..."
    (cd frontend && npm install)
fi

echo ""
echo "--------------------------------------------------------------------------"
echo "  Starting Services:"
echo "  • Backend API:      http://127.0.0.1:8000"
echo "  • Swagger Docs:     http://127.0.0.1:8000/docs"
echo "  • Frontend Web UI:  http://127.0.0.1:5173"
echo "--------------------------------------------------------------------------"
echo "  Press Ctrl+C to terminate both servers."
echo ""

# Cleanup trap on Ctrl+C
cleanup() {
    echo ""
    echo "[*] Shutting down Retail Intelligence Lab servers..."
    kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
    wait "$FRONTEND_PID" 2>/dev/null || true
    echo "[✓] Servers stopped cleanly."
    exit 0
}
trap cleanup SIGINT SIGTERM

# Start Backend
"$PYTHON" -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --log-level info &
BACKEND_PID=$!

# Wait for backend to be ready
sleep 1.5

# Start Frontend
(cd frontend && npm run dev -- --host 127.0.0.1 --port 5173) &
FRONTEND_PID=$!

wait
