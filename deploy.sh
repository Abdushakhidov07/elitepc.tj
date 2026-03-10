#!/bin/bash
# ──────────────────────────────────────────────
# Elite PC — Deploy Script for VDS
# ──────────────────────────────────────────────
# Usage:
#   1. Copy project to your VDS server
#   2. Copy .env.example to .env and fill in your values
#   3. Run: chmod +x deploy.sh && ./deploy.sh
# ──────────────────────────────────────────────

set -e

echo "=========================================="
echo "  Elite PC — Deployment"
echo "=========================================="

# Check .env file exists
if [ ! -f .env ]; then
    echo "ERROR: .env file not found!"
    echo "Copy .env.example to .env and fill in your values:"
    echo "  cp .env.example .env"
    echo "  nano .env"
    exit 1
fi

# Check Docker is installed
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed!"
    echo "Install Docker: https://docs.docker.com/engine/install/"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo "ERROR: Docker Compose is not installed!"
    exit 1
fi

echo ""
echo "1/5 Building Docker images..."
docker compose build

echo ""
echo "2/5 Starting services..."
docker compose up -d

echo ""
echo "3/5 Waiting for database to be ready..."
sleep 10

echo ""
echo "4/5 Running Django migrations..."
docker compose exec web python manage.py migrate --noinput

echo ""
echo "5/5 Creating superuser (if not exists)..."
docker compose exec web python manage.py shell -c "
from apps.users.models import User
if not User.objects.filter(is_superuser=True).exists():
    User.objects.create_superuser(
        username='admin',
        email='admin@elitepc.tj',
        password='admin123',
        first_name='Admin',
        last_name='ElitePC'
    )
    print('Superuser created: admin / admin123')
    print('IMPORTANT: Change the password immediately!')
else:
    print('Superuser already exists, skipping.')
"

echo ""
echo "=========================================="
echo "  Deployment Complete!"
echo "=========================================="
echo ""
echo "Your site is available at:"
echo "  http://$(hostname -I | awk '{print $1}')"
echo ""
echo "Django Admin: http://YOUR_DOMAIN/django-admin/"
echo "API Docs:     http://YOUR_DOMAIN/api/docs/"
echo "Admin Panel:  http://YOUR_DOMAIN/admin"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f          # View logs"
echo "  docker compose restart web      # Restart backend"
echo "  docker compose down             # Stop all services"
echo "  docker compose up -d --build    # Rebuild and restart"
echo ""
echo "To load sample data:"
echo "  docker compose exec web python manage.py seed_data"
echo ""
