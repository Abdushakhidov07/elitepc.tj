@echo off
REM ─────────────────────────────────────────────────────────────────────────────
REM Elite PC — No-Docker Setup Script (Windows)
REM ─────────────────────────────────────────────────────────────────────────────
REM Usage: Double-click setup.bat  OR  run from cmd/PowerShell:
REM   setup.bat
REM ─────────────────────────────────────────────────────────────────────────────

echo ==========================================
echo   Elite PC — Setup (Windows, no Docker)
echo ==========================================
echo.

REM ── 1. Backend ──────────────────────────────────────────────────────────────

echo ^>^>^> [1/5] Setting up Python virtual environment...

REM Create venv at project root
if not exist ".venv" (
    python -m venv .venv
    echo   Created .venv
)

call .venv\Scripts\activate.bat

cd backend

echo ^>^>^> [2/5] Installing Python dependencies...
python -m pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
echo   Done.

REM Copy .env if missing
if not exist "..\\.env" (
    if exist "..\\.env.example" (
        copy "..\\.env.example" "..\\.env" > nul
        echo   Copied .env.example -^> .env  (review and edit if needed)
    )
)

set DJANGO_SETTINGS_MODULE=config.settings.local
set PYTHONPATH=.

echo ^>^>^> [3/5] Running database migrations...
python manage.py migrate --noinput
echo   Migrations applied.

echo ^>^>^> [4/5] Seeding database...
python manage.py seed_data
echo   Database seeded.

cd ..
call .venv\Scripts\deactivate.bat 2>nul

REM ── 2. Frontend ──────────────────────────────────────────────────────────────

echo ^>^>^> [5/5] Setting up frontend...
cd frontend

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo   WARNING: Node.js not found. Skipping frontend build.
    echo   Install Node.js from https://nodejs.org/ and run:
    echo     cd frontend ^&^& npm install ^&^& npm run build
    goto :done
)

REM Copy frontend .env if missing
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" > nul
        echo   Copied frontend .env.example -^> .env
    )
)

echo   Installing npm packages...
call npm install --silent
echo   Building frontend...
call npm run build
echo   Frontend built -^> dist\

cd ..

:done
echo.
echo ==========================================
echo   Setup Complete!
echo ==========================================
echo.
echo Start the development servers:
echo.
echo   Backend (new terminal):
echo     .venv\Scripts\activate
echo     cd backend ^&^& python manage.py runserver
echo.
echo   Frontend dev mode (new terminal):
echo     cd frontend
echo     npm run dev
echo.
echo Django Admin: http://localhost:8000/django-admin/
echo   admin / admin123456
echo.
echo API Docs: http://localhost:8000/api/docs/
echo.
pause
