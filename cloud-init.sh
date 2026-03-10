#!/bin/sh
# =============================================================================
# Elite PC — Cloud-init скрипт автоматической настройки VDS
# =============================================================================
# ПЕРЕД ИСПОЛЬЗОВАНИЕМ замени переменные ниже:
# =============================================================================

REPO_URL="https://github.com/ТВО_GITHUB/elitepc.git"   # <-- URL репозитория
DOMAIN="elitepc.tj"                                       # <-- твой домен
APP_DIR="/var/www/elitepc"
DB_NAME="elitepc_db"
DB_USER="elitepc_user"
DB_PASSWORD="$(openssl rand -hex 20)"                    # случайный пароль
SECRET_KEY="$(openssl rand -hex 50)"                     # случайный секрет
APP_USER="elitepc"

# Логировать всё
exec > /var/log/cloud-init-elitepc.log 2>&1
set -e

echo "======================================================"
echo " Elite PC VDS Setup — $(date)"
echo "======================================================"

# =============================================================================
# 1. Системные пакеты
# =============================================================================
echo "[1/9] Устанавливаем системные пакеты..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq

apt-get install -y -qq \
    git curl wget gnupg ca-certificates \
    python3.11 python3.11-venv python3.11-dev python3-pip \
    postgresql postgresql-contrib \
    nginx \
    certbot python3-certbot-nginx \
    build-essential libpq-dev

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y -qq nodejs

echo "  Python: $(python3.11 --version)"
echo "  Node:   $(node --version)"
echo "  npm:    $(npm --version)"

# =============================================================================
# 2. PostgreSQL
# =============================================================================
echo "[2/9] Настраиваем PostgreSQL..."
systemctl enable postgresql
systemctl start postgresql

sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true

echo "  БД: $DB_NAME / пользователь: $DB_USER"

# =============================================================================
# 3. Системный пользователь
# =============================================================================
echo "[3/9] Создаём системного пользователя $APP_USER..."
useradd --system --shell /bin/bash --home $APP_DIR $APP_USER 2>/dev/null || true

# =============================================================================
# 4. Клонирование репозитория
# =============================================================================
echo "[4/9] Клонируем репозиторий..."
git clone "$REPO_URL" "$APP_DIR"
chown -R $APP_USER:$APP_USER "$APP_DIR"

# =============================================================================
# 5. Python venv + зависимости
# =============================================================================
echo "[5/9] Устанавливаем Python зависимости..."
cd "$APP_DIR"
python3.11 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip --quiet
pip install -r backend/requirements.txt --quiet

# =============================================================================
# 6. .env файл
# =============================================================================
echo "[6/9] Создаём .env..."
cat > "$APP_DIR/.env" <<EOF
DEBUG=False
SECRET_KEY=$SECRET_KEY
ALLOWED_HOSTS=$DOMAIN,www.$DOMAIN
CORS_ALLOWED_ORIGINS=https://$DOMAIN,https://www.$DOMAIN

DB_ENGINE=postgresql
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_HOST=localhost
DB_PORT=5432
EOF

chown $APP_USER:$APP_USER "$APP_DIR/.env"
chmod 600 "$APP_DIR/.env"

# Сохраняем пароли в отдельный файл (для справки)
cat > /root/elitepc-credentials.txt <<EOF
=== Elite PC — Реквизиты ===
Домен:       https://$DOMAIN
Django Admin: https://$DOMAIN/django-admin/
  admin / admin123456  (сменить сразу!)

PostgreSQL:
  БД:        $DB_NAME
  Пользователь: $DB_USER
  Пароль:    $DB_PASSWORD

Django SECRET_KEY: $SECRET_KEY

Логи setup: /var/log/cloud-init-elitepc.log
EOF
chmod 600 /root/elitepc-credentials.txt
echo "  Реквизиты сохранены в /root/elitepc-credentials.txt"

# =============================================================================
# 7. Миграции + сид + статика
# =============================================================================
echo "[7/9] Миграции, сид, статика..."
cd "$APP_DIR/backend"

export DJANGO_SETTINGS_MODULE=config.settings.local
export PYTHONPATH="$APP_DIR/backend"

# Загружаем .env вручную
set -a; source "$APP_DIR/.env"; set +a

python manage.py migrate --noinput
python manage.py seed_data
python manage.py collectstatic --noinput

chown -R $APP_USER:$APP_USER "$APP_DIR/backend/media"
chown -R $APP_USER:$APP_USER "$APP_DIR/backend/static"

# =============================================================================
# 8. Фронтенд
# =============================================================================
echo "[8/9] Собираем фронтенд..."
cd "$APP_DIR/frontend"

cat > "$APP_DIR/frontend/.env" <<EOF
VITE_API_BASE_URL=https://$DOMAIN/api/v1
EOF

npm install --silent
npm run build

# =============================================================================
# 9. Gunicorn systemd сервис
# =============================================================================
echo "[9/9] Настраиваем Gunicorn + Nginx..."

cat > /etc/systemd/system/elitepc.service <<EOF
[Unit]
Description=Elite PC Django (Gunicorn)
After=network.target postgresql.service

[Service]
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR/backend
EnvironmentFile=$APP_DIR/.env
Environment="DJANGO_SETTINGS_MODULE=config.settings.local"
Environment="PYTHONPATH=$APP_DIR/backend"
ExecStart=$APP_DIR/.venv/bin/gunicorn \\
    --workers 3 \\
    --bind unix:/run/elitepc.sock \\
    --access-logfile /var/log/elitepc-access.log \\
    --error-logfile /var/log/elitepc-error.log \\
    config.wsgi:application
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable elitepc
systemctl start elitepc

# =============================================================================
# Nginx конфиг (HTTP — certbot добавит HTTPS)
# =============================================================================
cat > /etc/nginx/sites-available/elitepc <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    client_max_body_size 20M;

    # Фронтенд (React SPA)
    root $APP_DIR/frontend/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API → Gunicorn
    location /api/ {
        proxy_pass http://unix:/run/elitepc.sock;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Django Admin
    location /django-admin/ {
        proxy_pass http://unix:/run/elitepc.sock;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Статика Django
    location /static/ {
        alias $APP_DIR/backend/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Медиафайлы (фото товаров)
    location /media/ {
        alias $APP_DIR/backend/media/;
        expires 7d;
    }
}
EOF

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/elitepc /etc/nginx/sites-enabled/
nginx -t
systemctl enable nginx
systemctl restart nginx

# =============================================================================
# SSL (Let's Encrypt) — только если DNS уже настроен на этот IP
# =============================================================================
# Раскомментируй если DNS уже указывает на сервер:
# certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN

# =============================================================================
echo ""
echo "======================================================"
echo " ГОТОВО! Elite PC развёрнут."
echo "======================================================"
echo ""
echo " Сайт:        http://$DOMAIN"
echo " Django Admin: http://$DOMAIN/django-admin/"
echo " Реквизиты:   cat /root/elitepc-credentials.txt"
echo " Логи Django:  journalctl -u elitepc -f"
echo ""
echo " После настройки DNS запусти SSL:"
echo "   certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo ""
