# Elite PC - E-Commerce Platform

Интернет-магазин компьютеров и комплектующих в Таджикистане.

## Tech Stack

- **Backend:** Django 5.1 + Django REST Framework + PostgreSQL
- **Frontend:** React 18 + TypeScript + Tailwind CSS + Vite
- **Auth:** JWT (djangorestframework-simplejwt)
- **Admin:** django-jazzmin
- **Tasks:** Celery + Redis
- **Notifications:** Telegram Bot
- **AI:** OpenAI / Anthropic API (для оценки конфигураций)
- **Docs:** drf-spectacular (Swagger)

## Quick Start

### Backend

```bash
cd backend
python -m venv ../.venv
source ../.venv/Scripts/activate  # Windows
# source ../.venv/bin/activate    # Linux/Mac
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_data
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Test Users

| Username | Password | Role |
|----------|----------|------|
| admin | admin123456 | Superuser |
| manager | manager123456 | Staff |
| customer | customer123456 | Customer |

## API Documentation

After starting the backend: http://localhost:8000/api/docs/

## Admin Panel

http://localhost:8000/admin/

## Project Structure

```
elitepc/
├── backend/
│   ├── config/              # Django settings
│   ├── apps/
│   │   ├── products/        # Products, categories, specs
│   │   ├── users/           # Users, profiles, wishlist
│   │   ├── cart/            # Shopping cart
│   │   ├── orders/          # Orders, status tracking
│   │   ├── configurator/    # PC Builder with compatibility
│   │   ├── notifications/   # Telegram notifications
│   │   └── analytics/       # Dashboard analytics
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── api/             # API client + modules
│   │   ├── components/      # UI + Layout components
│   │   ├── pages/           # Route pages
│   │   ├── store/           # Zustand stores
│   │   └── types/           # TypeScript types
│   └── package.json
├── docker-compose.yml
└── .env.example
```

## Docker

```bash
cp .env.example .env
# Edit .env with your settings
docker-compose up -d
```
