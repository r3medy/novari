# Novari Backend

Django 6 REST API for the Novari storefront. This **`backend-system`** branch is backend-only — the React frontend lives on **`main`**.

## Stack

- Django 6 + Django REST Framework
- PostgreSQL 16 (Docker Compose for local dev)
- Token-based admin auth, product catalog, orders, image upload

## Local setup

```powershell
copy .env.example .env
docker compose up -d
python -m venv .venv
.\.venv\Scripts\pip install django djangorestframework django-cors-headers pillow psycopg2-binary
.\.venv\Scripts\python manage.py migrate
.\.venv\Scripts\python manage.py seed_products
.\.venv\Scripts\python manage.py runserver
```

API: http://localhost:8000  
Endpoints are under `/api/` (e.g. `GET /api/products/`).

Pair with the frontend on **`main`**: set `VITE_API_URL=http://localhost:8000` in `.env.local` before `pnpm dev`.

## Admin

`seed_products` creates `admin@novari.test`. Password comes from `SEED_ADMIN_PASSWORD` in `.env`, or is printed to the console if unset.
