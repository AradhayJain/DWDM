@echo off
REM ==============================================================================
REM RETAIL INTELLIGENCE LAB — WINDOWS STARTUP RUNNER
REM DTU SE425 Data Warehouse and Data Mining Mini-Project
REM ==============================================================================

echo ==========================================================================
echo   Retail Intelligence Lab - DTU SE425 DWDM Mini-Project
echo   Full-Stack Data Warehouse ^& Data Mining Platform
echo ==========================================================================

REM Check virtual environment
IF NOT EXIST ".venv" (
    echo [!] Virtual environment not found. Creating .venv...
    python -m venv .venv
    call .venv\Scripts\activate.bat
    pip install -r requirements.txt
) ELSE (
    call .venv\Scripts\activate.bat
)

REM Check SQLite Warehouse
IF NOT EXIST "data\retail_dw.db" (
    echo [*] Initializing SQLite Warehouse tables...
    python -c "from backend.app.warehouse.loader import run_etl_pipeline; run_etl_pipeline()"
)

REM Check Frontend
IF NOT EXIST "frontend\node_modules" (
    echo [*] Installing frontend npm packages...
    cd frontend && npm install && cd ..
)

echo Starting Backend API on http://127.0.0.1:8000 ...
start "Retail Intelligence - Backend" cmd /k "call .venv\Scripts\activate.bat && uvicorn backend.app.main:app --host 127.0.0.1 --port 8000"

timeout /t 2 >nul

echo Starting Frontend Dev Server on http://127.0.0.1:5173 ...
start "Retail Intelligence - Frontend" cmd /k "cd frontend && npm run dev"

echo ==========================================================================
echo Both servers started. Open http://127.0.0.1:5173 in your browser.
echo ==========================================================================
pause
