@echo off
title AIDE Studio - AI-Assisted Data Extraction (LM Studio)
cd /d "%~dp0\backend"

echo ========================================================
echo    AIDE Studio 2.0 (Powered by Local LM Studio)
echo ========================================================
echo Starting backend server on http://localhost:8000 ...
echo.

if not exist "venv\Scripts\python.exe" (
    echo Virtual environment not found. Please run setup first.
    pause
    exit /b
)

start http://localhost:8000
venv\Scripts\python.exe run_backend.py
pause

