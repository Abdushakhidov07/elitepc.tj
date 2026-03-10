# Elite PC — Руководство по деплою на VDS

> Полная инструкция: от клонирования GitHub-репозитория до работающего сайта.

---

## Требования к серверу

| Параметр | Минимум | Рекомендуется |
|----------|---------|---------------|
| ОС | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| CPU | 1 ядро | 2 ядра |
| RAM | 2 GB | 4 GB |
| Диск | 20 GB | 40 GB SSD |
| Открытые порты | 22, 80, 443 | 22, 80, 443 |

---

## Шаг 1 — Подключение к серверу

```bash
ssh root@YOUR_SERVER_IP
```

---

## Шаг 2 — Установка Docker и Docker Compose

```bash
# Обновить пакеты
apt update && apt upgrade -y

# Установить зависимости
apt install -y ca-certificates curl gnupg lsb-release git

# Добавить Docker GPG ключ
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

# Добавить репозиторий Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

# Установить Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Проверить установку
docker --version
docker compose version
```

---

## Шаг 3 — Клонирование репозитория с GitHub

```bash
# Перейти в директорию для проектов
cd /opt

# Клонировать репозиторий
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git elitepc

# Перейти в папку проекта
cd /opt/elitepc
```

> Если репозиторий приватный, используйте SSH-ключ или Personal Access Token:
> ```bash
> git clone https://YOUR_TOKEN@github.com/YOUR_USERNAME/YOUR_REPO_NAME.git elitepc
> ```

---

## Шаг 4 — Настройка переменных окружения (.env)

```bash
# Скопировать шаблон
cp .env.example .env

# Открыть для редактирования
nano .env
```

Заполните все значения:

```env
# Django — сгенерируйте случайный ключ (минимум 50 символов)
SECRET_KEY=ваш-супер-секретный-ключ-минимум-50-символов-сюда

# Отключить режим разработки
DEBUG=False

# Ваш домен (через запятую, без пробелов)
ALLOWED_HOSTS=elitepc.tj,www.elitepc.tj

# База данных
DB_NAME=elitepc
DB_USER=postgres
DB_PASSWORD=придумайте-сложный-пароль-для-бд

# Redis и Celery — не менять (docker-compose настраивает автоматически)
REDIS_URL=redis://redis:6379/1
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# CORS — домены которым разрешено делать запросы к API
CORS_ALLOWED_ORIGINS=https://elitepc.tj,https://www.elitepc.tj

# CSRF — нужно для Django Admin через HTTPS
CSRF_TRUSTED_ORIGINS=https://elitepc.tj,https://www.elitepc.tj

# SSL — оставить False до настройки HTTPS, потом поменять на True
SECURE_SSL_REDIRECT=False

# Telegram (опционально — для уведомлений о заказах)
TELEGRAM_BOT_TOKEN=токен-бота-от-@BotFather
TELEGRAM_CHANNEL_ID=@ваш_канал_или_-100XXXXXXXXX

# Порт фронтенда (80 = стандартный HTTP)
FRONTEND_PORT=80

# Стоимость сборки ПК (в вашей валюте)
PC_ASSEMBLY_FEE=500
```

Как сгенерировать SECRET_KEY:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(50))"
```

Сохранить и выйти: `Ctrl+O`, `Enter`, `Ctrl+X`

---

## Шаг 5 — Первый запуск (deploy.sh)

```bash
# Дать права на выполнение скрипту
chmod +x deploy.sh

# Запустить деплой
./deploy.sh
```

Скрипт автоматически:
1. Соберёт Docker-образы (backend + frontend)
2. Запустит все 6 сервисов (PostgreSQL, Redis, Django, Celery, Celery Beat, Nginx)
3. Подождёт готовности базы данных
4. Применит миграции
5. Создаст суперпользователя `admin` / `admin123`

Время выполнения: **5–15 минут** (зависит от скорости сервера).

> После первого запуска **обязательно** смените пароль суперпользователя:
> ```bash
> docker compose exec web python manage.py changepassword admin
> ```

---

## Шаг 6 — Проверка работоспособности

Откройте в браузере:

| Адрес | Что должно открыться |
|-------|---------------------|
| `http://YOUR_SERVER_IP` | Главная страница сайта |
| `http://YOUR_SERVER_IP/api/docs/` | Swagger документация API |
| `http://YOUR_SERVER_IP/django-admin/` | Django Admin |
| `http://YOUR_SERVER_IP/admin` | Панель управления сайтом |

Проверить статус контейнеров:
```bash
docker compose ps
```

Все сервисы должны быть в статусе `running` или `healthy`.

---

## Шаг 7 — Настройка HTTPS (SSL через Nginx + Certbot)

> Выполнять **после** того как домен направлен на IP сервера и сайт открывается по HTTP.

### 7.1 Установить Nginx и Certbot на хосте

```bash
apt install -y nginx certbot python3-certbot-nginx
```

### 7.2 Остановить Docker-фронтенд на 80 порту

```bash
# Изменить порт в .env
nano .env
# Изменить: FRONTEND_PORT=8080

# Перезапустить
docker compose up -d frontend
```

### 7.3 Создать конфиг Nginx для вашего домена

```bash
nano /etc/nginx/sites-available/elitepc
```

Вставить:
```nginx
server {
    listen 80;
    server_name elitepc.tj www.elitepc.tj;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Активировать конфиг
ln -s /etc/nginx/sites-available/elitepc /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### 7.4 Получить SSL-сертификат

```bash
certbot --nginx -d elitepc.tj -d www.elitepc.tj
```

Следуйте инструкциям, выберите автоматический редирект с HTTP на HTTPS.

### 7.5 Включить SSL-редирект в Django

```bash
nano .env
# Изменить: SECURE_SSL_REDIRECT=True

docker compose restart web
```

Certbot автоматически обновляет сертификат каждые 90 дней.

---

## Обновление проекта (после git push)

```bash
cd /opt/elitepc

# Получить последние изменения
git pull origin main

# Пересобрать и перезапустить
docker compose up -d --build

# Применить новые миграции (если есть)
docker compose exec web python manage.py migrate --noinput

# Собрать статику (если изменился CSS/JS бэкенда)
docker compose exec web python manage.py collectstatic --noinput
```

---

## Полезные команды

### Просмотр логов

```bash
# Все сервисы (живой поток)
docker compose logs -f

# Только Django
docker compose logs -f web

# Только Celery
docker compose logs -f celery

# Последние 100 строк Nginx/фронтенда
docker compose logs --tail=100 frontend
```

### Управление сервисами

```bash
# Статус всех контейнеров
docker compose ps

# Перезапустить один сервис
docker compose restart web
docker compose restart celery

# Остановить всё
docker compose down

# Остановить и удалить данные (ОСТОРОЖНО — удалит БД!)
docker compose down -v

# Пересобрать и запустить
docker compose up -d --build
```

### Django управление

```bash
# Войти в shell Django
docker compose exec web python manage.py shell

# Создать суперпользователя
docker compose exec web python manage.py createsuperuser

# Сменить пароль пользователя
docker compose exec web python manage.py changepassword admin

# Применить миграции
docker compose exec web python manage.py migrate

# Загрузить тестовые данные
docker compose exec web python manage.py seed_data
```

### Резервное копирование БД

```bash
# Создать дамп базы данных
docker compose exec db pg_dump -U postgres elitepc > backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановить из дампа
cat backup_FILE.sql | docker compose exec -T db psql -U postgres elitepc
```

---

## Настройка Telegram-уведомлений

1. Создайте бота через [@BotFather](https://t.me/BotFather) — получите `TELEGRAM_BOT_TOKEN`
2. Добавьте бота в ваш канал/группу как администратора
3. Узнайте Chat ID канала:
   - Для публичного канала: `@ваш_канал`
   - Для приватного: используйте `@userinfobot` или API
4. Заполните в `.env`:
   ```env
   TELEGRAM_BOT_TOKEN=1234567890:ABCdef...
   TELEGRAM_CHANNEL_ID=@elitepc_orders
   ```
5. Перезапустите: `docker compose restart web celery`
6. В панели управления `/admin/telegram` — одобрите чат

---

## Диагностика проблем

### Сайт не открывается
```bash
docker compose ps                    # Проверить статус контейнеров
docker compose logs web              # Логи Django
docker compose logs frontend         # Логи Nginx
```

### Ошибка 502 Bad Gateway
```bash
docker compose restart web           # Перезапустить Django
docker compose logs -f web           # Смотреть логи в реальном времени
```

### Ошибка базы данных
```bash
docker compose logs db               # Логи PostgreSQL
docker compose exec db psql -U postgres -c "\l"  # Список баз данных
```

### Celery не работает (уведомления не приходят)
```bash
docker compose logs celery           # Логи воркера
docker compose restart celery celery-beat
```

### Не хватает места на диске
```bash
df -h                                # Проверить место
docker system prune -f               # Удалить неиспользуемые образы
docker volume ls                     # Список томов
```

---

## Структура сервисов

```
┌─────────────────────────────────────────┐
│  Браузер → :80 (или :443 через Nginx)   │
└──────────────────┬──────────────────────┘
                   │
         ┌─────────▼────────┐
         │  frontend (Nginx) │  :80
         │  React SPA        │
         └─────────┬─────────┘
                   │ /api/* proxy
         ┌─────────▼────────┐
         │   web (Gunicorn) │  :8000 (внутренний)
         │   Django REST API │
         └────┬──────────────┘
              │
    ┌─────────┴──────────┐
    │                    │
┌───▼───┐          ┌─────▼──────┐
│  db   │          │   redis    │
│ Postgres│        │  Cache/MQ  │
└───────┘          └─────┬──────┘
                         │
              ┌──────────┴─────────┐
              │                    │
         ┌────▼────┐        ┌──────▼────┐
         │ celery  │        │celery-beat│
         │ worker  │        │ scheduler │
         └─────────┘        └───────────┘
```

---

*Если что-то не работает — смотрите логи: `docker compose logs -f`*
