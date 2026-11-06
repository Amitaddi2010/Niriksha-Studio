@echo off
title AIDE Studio - Development Mode
cd /d "%~dp0"

echo Starting Backend Server on http://localhost:8000 ...
start cmd /k "cd backend && venv\Scripts\python.exe run_backend.py"

echo Starting Vite Dev Server on http://localhost:5173 ...
start cmd /k "cd frontend && npm run dev"

timeout /t 3 >nul
start http://localhost:5173

