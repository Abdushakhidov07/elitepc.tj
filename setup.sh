#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Elite PC — No-Docker Setup Script (Linux / macOS)
# ─────────────────────────────────────────────────────────────────────────────
# Usage:
#   chmod +x setup.sh && ./setup.sh
#
# What it does:
#   1. Creates Python venv and installs backend dependencies
#   2. Copies .env.example → .env (if not exists)
#   3. Runs Django migrations
#   4. Seeds the database (categories, filters, sample products, admin user)
#   5. Installs frontend dependencies and builds the production bundle
# ─────────────────────────────────────────────────────────────────────────────

set -e

PYTHON=${PYTHON:-python3}
NODE=${NODE:-node}

echo "=========================================="
echo "  Elite PC — Setup (no Docker)"
echo "=========================================="
echo ""

# ── 1. Backend ──────────────────────────────────────────────────────────────

echo ">>> [1/5] Setting up Python virtual environment..."

# Create venv at project root (used by both backend and frontend tooling)
if [ ! -d ".venv" ]; then
    $PYTHON -m venv .venv
    echo "  Created .venv"
fi

# Activate venv
if [ -f ".venv/Scripts/activate" ]; then
    source .venv/Scripts/activate   # Windows Git Bash
else
    source .venv/bin/activate       # Linux / macOS
fi

cd backend

echo ">>> [2/5] Installing Python dependencies..."
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
echo "  Done."

# Copy .env if missing
if [ ! -f ../.env ]; then
    if [ -f ../.env.example ]; then
        cp ../.env.example ../.env
        echo "  Copied .env.example -> .env  (review and edit if needed)"
    fi
fi

# Point Django to .env in project root
export DJANGO_SETTINGS_MODULE=config.settings.local
export PYTHONPATH=.

# Load .env variables (if dotenv not loading automatically)
if [ -f ../.env ]; then
    set -a
    source ../.env
    set +a
fi

echo ">>> [3/5] Running database migrations..."
python manage.py migrate --noinput
echo "  Migrations applied."

echo ">>> [4/5] Seeding database..."
python manage.py seed_data
echo "  Database seeded."

cd ..
deactivate

# ── 2. Frontend ──────────────────────────────────────────────────────────────

echo ">>> [5/5] Setting up frontend..."
cd frontend

if ! command -v node &> /dev/null; then
    echo "  WARNING: Node.js not found. Skipping frontend build."
    echo "  Install Node.js from https://nodejs.org/ and run:"
    echo "    cd frontend && npm install && npm run build"
else
    # Copy frontend .env if missing
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            echo "  Copied frontend .env.example -> .env"
        fi
    fi

    echo "  Installing npm packages..."
    npm install --silent
    echo "  Building frontend..."
    npm run build
    echo "  Frontend built -> dist/"
fi

cd ..

# ── Done ─────────────────────────────────────────────────────────────────────

echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "Start the development servers:"
echo ""
echo "  Backend:"
echo "    source .venv/bin/activate  (or .venv/Scripts/activate on Windows)"
echo "    cd backend && python manage.py runserver"
echo ""
echo "  Frontend (dev mode):"
echo "    cd frontend"
echo "    npm run dev"
echo ""
echo "Django Admin: http://localhost:8000/django-admin/"
echo "  admin / admin123456"
echo ""
echo "API Docs: http://localhost:8000/api/docs/"
echo ""
