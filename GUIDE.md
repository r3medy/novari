# Novari — Hosting Guide (from scratch)

Step-by-step instructions to take Novari from this repository to a live production site.
Novari has **two independent parts** hosted separately — frontend on **`main`**, backend on **`backend-system`** (Django at repo root in that checkout):


| Part                                    | Stack                       | Lives in            | Output                           |
| --------------------------------------- | --------------------------- | ------------------- | -------------------------------- |
| **Frontend** (storefront + React admin) | React 19 + Vite 8           | repo root (`/`)     | static files in `dist/`          |
| **Backend** (REST API)                  | Django 6 + DRF + PostgreSQL | **`backend-system`** branch (repo root) | a long-running server (Gunicorn) |


They talk to each other over HTTPS: the frontend calls the backend API using `VITE_API_URL`
(build-time env var), and the backend allows the frontend's origin via CORS.

> Read this whole guide once before clicking anything. The order of operations matters:
> **database → backend → frontend**, because the frontend must be built *after* you know the
> backend's URL.

---

## 0. TL;DR — recommended stack for a small commercial store

Cheapest reliable, no cold-start surprises, commercial-use allowed:


| Layer                   | Recommended                                   | Why                                           | Cost (2026)  |
| ----------------------- | --------------------------------------------- | --------------------------------------------- | ------------ |
| Database                | **Neon** Postgres (free) → paid when you grow | Pure Postgres, branching, scales to zero      | $0 → ~$19/mo |
| Backend                 | **Railway**                                   | No cold starts, GitHub auto-deploy, best DX   | ~$5/mo       |
| Frontend                | **Cloudflare Pages**                          | Free, commercial use allowed, global CDN      | $0           |
| Media (uploaded images) | **Cloudflare R2** + `django-storages`         | 10 GB free, **free egress**, survives deploys | $0           |


**Realistic total to launch: ~$5/month** (Railway). Everything else is free-tier.

> Why not Vercel for the frontend? Vercel's **Hobby plan prohibits commercial use** (a store that
> sells products counts). You'd need Vercel **Pro at $20/mo**. Cloudflare Pages has no such
> restriction. Why not Render free for the backend? It spins down after 15 min of inactivity, so
> the first customer after a quiet period waits 15–30 s — bad for sales.

The sections below cover the recommended path in full, plus alternatives (Render, Fly.io, VPS,
Vercel, Netlify, Supabase) so you can choose.

---

## 1. Prerequisites

Before you start, have ready:

- [ ] The Novari git repository pushed to **GitHub** or **GitLab** (public or private both fine).
  - Cloudflare Pages, Railway, Vercel, Netlify all deploy from a Git repo on push.
- [ ] A card on file for any paid provider (Railway requires it even for the $5 plan).
- [ ] Your production domain(s) — optional to start. You can launch on free `*.pages.dev` /
  `*.up.railway.app` subdomains and add a custom domain later (Section 8).
- [ ] Local tools to test the build: `pnpm` (frontend), `python` + `pip` (backend).

### Accounts to create (all free to sign up)

- [ ] **Cloudflare** account (for Pages + R2) — [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)
- [ ] **Railway** account — [https://railway.app](https://railway.app)
- [ ] **Neon** account (GitHub/Google login) — [https://neon.tech](https://neon.tech)

- (Alternative providers only if you choose them: Render, Fly.io, Vercel, Netlify, Supabase.)

---

## 2. Architecture at a glance

```
  Customer browser
        │  https://yourdomain.com  (or novari.pages.dev)
        ▼
┌──────────────────────┐        https://api.yourdomain.com  (or novari-api.up.railway.app)
│  Cloudflare Pages    │                    │
│  (frontend, static)  │  fetch(VITE_API_URL + /api/...)   │
│  dist/               │ ─────────────────────────────────▶│
└──────────────────────┘                                   ▼
                                                ┌──────────────────────┐
                                                │  Railway (backend)   │
                                                │  Gunicorn + Django   │
                                                └──────────┬───────────┘
                                                           │  TCP 5432
                                                           ▼
                                                ┌──────────────────────┐
                                                │  Neon (Postgres)     │
                                                └──────────────────────┘

  Admin uploads product image:
     Frontend ──▶ POST /api/admin/upload/ ──▶ Django writes to Cloudflare R2 ──▶ returns R2 URL
```

Three rules that make it all work (covered in detail later):

1. `**VITE_API_URL**` (frontend, set at *build* time) = the backend's public origin, no trailing slash, no `/api`.
2. `**DJANGO_CORS_ALLOWED_ORIGINS**` (backend) = the frontend's public origin(s).
3. `**DJANGO_ALLOWED_HOSTS**` (backend) = the backend's own hostname(s).

---

## 3. Hosting options at a glance

### Frontend (static)


| Platform             | Free for commercial?                        | Cold starts? | Notes                                         |
| -------------------- | ------------------------------------------- | ------------ | --------------------------------------------- |
| **Cloudflare Pages** | ✅ Yes                                       | No           | Recommended. Global CDN, unlimited bandwidth. |
| Netlify              | Free tier ok for small commercial; generous | No           | Good alternative; similar `_redirects` setup. |
| Vercel               | ❌ Hobby forbids commercial → Pro $20/mo     | No           | Best DX, but costs for a store.               |


### Backend (Django)


| Platform                   | Always-on?                | Cost to start       | Notes                                                              |
| -------------------------- | ------------------------- | ------------------- | ------------------------------------------------------------------ |
| **Railway**                | ✅                         | ~$5/mo (Hobby)      | Recommended. GitHub auto-deploy, Procfile.                         |
| Render (free)              | ❌ spins down after 15 min | $0                  | Cold starts hurt a store; use paid Starter ($7/mo) to avoid.       |
| Render (paid)              | ✅                         | $7/mo               | Solid alternative to Railway.                                      |
| Fly.io                     | ✅                         | usage-based (~$2–5) | Needs a Dockerfile; more control.                                  |
| VPS (Hetzner/DigitalOcean) | ✅                         | $4–6/mo             | Cheapest at scale; you run Nginx + Gunicorn yourself (Section 7D). |


### Database (PostgreSQL)


| Platform                   | Free tier                                 | Catch                                       | Recommendation                                     |
| -------------------------- | ----------------------------------------- | ------------------------------------------- | -------------------------------------------------- |
| **Neon**                   | 0.5 GB, scales to zero after 5 min        | ~1 s wake on first query                    | Best free start. Upgrade paid when traffic grows.  |
| Supabase                   | 500 MB, pauses after **1 week**           | Longer cold wake; BaaS extras you won't use | Fine, but Neon is leaner for this app.             |
| Railway Postgres           | Paid (part of usage)                      | None — always on                            | Simplest if backend is already on Railway.         |
| Render Postgres free       | ⚠️ **free DBs are deleted after 90 days** | Data loss!                                  | Do **not** use Render free Postgres for real data. |
| AWS RDS / Google Cloud SQL | Paid, production-grade                    | —                                           | Best for serious scale/uptime.                     |


> ⚠️ **Never use Render's free PostgreSQL for production** — it is deleted after 90 days. Use Neon
> (free) or a paid managed Postgres.

---

## 4. Step 0 — Prepare the backend for deployment (one-time)

The backend currently ships with a `Pipfile` but is missing a few things every production Django
deploy needs. Do this once, commit it, and every platform below will work.

> These are small, safe additions. They do **not** change app behavior locally.

### 4.1 Create `Novari/requirements.txt`

This replaces the `Pipfile` for deployment (cleaner on PaaS) and adds `gunicorn` (the production
WSGI server) and `whitenoise` (serves Django admin static files on PaaS). The `Pipfile`'s
`firebase-admin` / `google-cloud-firestore` are unused leftovers — leave them out.

Create `**Novari/requirements.txt**`:

```txt
Django>=6.0,<6.1
djangorestframework>=3.15
django-cors-headers>=4.4
Pillow>=10.4
psycopg2-binary>=2.9
gunicorn>=23.0
whitenoise>=6.7
```

> If your provider builds `psycopg2-binary` from source and fails, swap it for `psycopg[binary]>=3.2`
> (the modern driver). Both work with Django.

### 4.2 Create `Novari/Procfile`

This tells Railway/Render how to start the web server and run migrations on each release.

Create `**Novari/Procfile**` (no file extension):

```
release: python manage.py migrate --noinput
web: gunicorn Novari.wsgi:application
```

> The `release` line runs migrations automatically before each deploy goes live — so you never
> forget them. If you'd rather run migrations manually, delete the `release` line.

### 4.3 Add `STATIC_ROOT` + WhiteNoise to `Novari/Novari/settings.py`

Production needs a place to collect static files and a way to serve the (optional) Django admin.
Add these two things:

**(a)** Add WhiteNoise to `MIDDLEWARE`, immediately after `SecurityMiddleware`:

```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',   # <-- add this line
    'corsheaders.middleware.CorsMiddleware',
    ...
]
```

**(b)** Set `STATIC_ROOT` next to the existing `STATIC_URL = 'static/'` line:

```python
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'   # <-- add this line (collectstatic output)
```

> WhiteNoise is mainly for the optional Django admin at `/django-admin/`. Your React admin in
> `src/pages/Admin.tsx` does not depend on it. It's still good practice to include it.

### 4.4 (Optional but recommended) Parse the database URL automatically

Most providers give you one connection string like
`postgresql://user:pass@ep-xxx.neon.tech/novari?sslmode=require`. Your `settings.py` currently
expects separate `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` vars.

You can either **(A)** copy each field by hand from the provider's "Connection details" panel
(works everywhere, no code change), **or (B)** add tiny auto-parsing so you only paste one string.

To use option B, add `dj-database-url` to `Novari/requirements.txt`:

```txt
dj-database-url>=2.3
```

…and replace the whole `DATABASES = { ... }` block in `settings.py` with:

```python
import dj_database_url

DATABASES = {
    'default': dj_database_url.config(
        # Falls back to the individual DB_* vars below if DATABASE_URL is not set.
        conn_max_age=600,
    )
    or {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('DB_NAME', 'novari_db'),
            'USER': os.environ.get('DB_USER', 'novari_user'),
            'PASSWORD': DB_PASSWORD,
            'HOST': os.environ.get('DB_HOST', 'localhost'),
            'PORT': os.environ.get('DB_PORT', '5433'),
        },
    }
}
```

Then on the provider you only need to set `DATABASE_URL` (plus `DB_PASSWORD` is no longer
required by itself). Section 5 shows both approaches per provider.

> Keep it simple: if you're unsure, use **option A** (set the five `DB_*` vars individually). It's
> more fields but no code change.

### 4.5 Pin the Python version (optional)

Create `**Novari/runtime.txt**` with:

```
python-3.13
```

Django 6.0 officially supports **Python 3.12, 3.13, and 3.14** (it dropped 3.10/3.11). `3.13` is a
safe default available on every major host; `3.12` and `3.14` also work (your local venv uses
3.14). Railway/Render read this file; on other platforms set the Python version in the dashboard.

### 4.6 Verify locally before deploying

```bash
# backend
cd Novari
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt        # Windows  (use source .venv/bin/activate on macOS/Linux)
# set env vars (Windows PowerShell):
$env:DJANGO_SECRET_KEY="dev-only-key"; $env:DB_PASSWORD="7706"; $env:DJANGO_DEBUG="true"
.venv\Scripts\python manage.py check --deploy        # should pass with a strong key + DEBUG=false
.venv\Scripts\python manage.py test novari_base      # 6 tests pass

# frontend
cd ..
pnpm install
pnpm lint && pnpm build      # passes; outputs dist/
```

Commit all the new files (`requirements.txt`, `Procfile`, `runtime.txt`, settings changes) and
push. **Now the repo is deploy-ready.**

---

## 5. Host the database (Neon — recommended)

1. Sign in to [https://console.neon.tech](https://console.neon.tech) and **Create new project** → name it `novari`, pick a
  region close to your backend (see backend region in Section 6).
2. Neon creates a database. On the project **Dashboard** or **Connection Details** tab, choose
  **Pooled connection** (or direct) and copy the connection string. It looks like:
3. Break it into the values you'll set on the backend (or use `DATABASE_URL` whole if you did
  Section 4.4 option B):

  | From the string                                   | Set this env var |
  | ------------------------------------------------- | ---------------- |
  | `novari_owner` (after `//`, before `:`)           | `DB_USER`        |
  | `AbC123...` (after `:`, before `@`)               | `DB_PASSWORD`    |
  | `ep-cool-rain-123456.us-east-2.aws.neon.tech`     | `DB_HOST`        |
  | `5432` (Neon default; pooled is sometimes `5432`) | `DB_PORT`        |
  | `novari` (after the last `/`, before `?`)         | `DB_NAME`        |

   Or just set `**DATABASE_URL**` to the whole string (if using `dj_database_url`).

> Neon's free tier scales to zero after 5 min of inactivity; the first request after idle takes
> ~1 s to wake the DB. For a store with regular traffic this is invisible. If it bothers you,
> upgrade to Neon's paid plan (always-on) or use Railway Postgres.

### Alternatives

- **Railway Postgres** — in Railway, New → Database → PostgreSQL. Gives a `DATABASE_URL`. Paid
(counts against your $5/mo usage) but always-on and in the same network as your backend (fast).
- **Supabase** — [https://supabase.com](https://supabase.com) → New project → copy the Postgres connection string from
Project Settings → Database. Free 500 MB; pauses after 1 week of inactivity (longer cold wake).
- **AWS RDS / Google Cloud SQL** — for real scale/uptime. Configure security group/firewall to
allow only your backend host's IP.

---

## 6. Host the backend (Railway — recommended)

### 6.1 Create the service

1. Go to [https://railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → authorize and pick
  your Novari repo.
2. Railway detects it's a Python app. **Important:** the Django code lives in the `Novari/`
  subfolder, not the repo root. In the service **Settings → Build** set:
  - **Root Directory:** `Novari`
  - **Build Command:** `pip install -r requirements.txt && python manage.py collectstatic --noinput`
  - **Start Command:** `gunicorn Novari.wsgi:application`
  - (Or rely on the `Procfile` from Section 4.2 — Railway reads it. Either way works.)
3. Railway asks for a payment method and starts on the **Hobby** plan ($5/mo includes $5 of usage).

### 6.2 Set backend environment variables

In the service **Variables** tab, add (values from Section 5 + your domains):


| Variable                      | Example value                                                        |
| ----------------------------- | -------------------------------------------------------------------- |
| `DJANGO_SECRET_KEY`           | (run `python -c "import secrets; print(secrets.token_urlsafe(50))"`) |
| `DJANGO_DEBUG`                | `false`                                                              |
| `DJANGO_ALLOWED_HOSTS`        | `novari-api.up.railway.app` (add your custom domain later)           |
| `DJANGO_CORS_ALLOWED_ORIGINS` | `https://novari.pages.dev` (add your storefront domain later)        |
| `DB_NAME`                     | `novari`                                                             |
| `DB_USER`                     | `novari_owner`                                                       |
| `DB_PASSWORD`                 | (from Neon)                                                          |
| `DB_HOST`                     | `ep-cool-rain-123456.us-east-2.aws.neon.tech`                        |
| `DB_PORT`                     | `5432`                                                               |


> Using `dj_database_url` (Section 4.4 option B)? Then just set `DATABASE_URL` to the full Neon
> string and you can drop the five `DB_*` vars (keep `DB_PASSWORD` only if your settings still
> requires it — with the snippet in 4.4 it no longer does).

### 6.3 Deploy + first-run commands

1. Railway builds and starts. The `release` Procfile line runs migrations automatically. If you
  removed it, run migrations once via Railway's **Terminal** (or `railway run`):
2. Open Railway's **Terminal** for the service and create your production admin user:
  ```bash
   python manage.py shell -c "from novari_base.models import User; u=User(email='admin@yourdomain.com', name='Admin', role=User.ROLE_ADMIN); u.set_password('A_STRONG_PASSWORD'); u.save(); print('created', u.id)"
  ```
   Put that password in a password manager — there is no password reset flow.
3. (Optional) Load sample products to see something on the storefront:
  ```bash
   python manage.py seed_products
  ```
   The admin password is auto-generated and printed once (or set `SEED_ADMIN_PASSWORD`). For real
   launch, enter products via the React admin instead.
4. Railway gives your API a public URL like `https://novari-api.up.railway.app`. Test it:
  ```
   https://novari-api.up.railway.app/api/products/   → returns [] or your seeded products
  ```
   You should see a JSON list. If you see a Django error page, check the **Deploy Logs**.

**Write down the backend URL — you need it for the frontend build in Section 7.**

### 6.4 Alternatives

#### Render (budget / free with cold starts)

1. [https://render.com](https://render.com) → **New +** → **Web Service** → connect your repo.
2. Set **Root Directory:** `Novari`.
3. **Runtime:** Python 3. **Build Command:** `pip install -r requirements.txt && python manage.py collectstatic --noinput`.
4. **Start Command:** `gunicorn Novari.wsgi:application`.
5. Add the same env vars as Section 6.2 (Render has an "Environment" tab).
6. Instance type: **Free** (spins down after 15 min idle → 15–30 s cold start) or **Starter $7/mo** (always-on, recommended for a store).
7. Render runs `release` from the Procfile automatically (migrations).

#### Fly.io (more control, needs Dockerfile)

1. `flyctl launch` in `Novari/` — it generates a `Dockerfile` and `fly.toml`.
2. Use a Dockerfile that installs `requirements.txt`, runs `collectstatic`, and starts `gunicorn Novari.wsgi:application`.
3. `flyctl secrets set DJANGO_SECRET_KEY=... DB_PASSWORD=...` (etc.).
4. `flyctl deploy`, then `flyctl ssh console -c "python manage.py migrate"`.

#### VPS (Hetzner / DigitalOcean) — Section 7D has the full Nginx + Gunicorn walkthrough.

---

## 7. Host the frontend (Cloudflare Pages — recommended)

### 7.1 Create the project

1. [https://dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Authorize GitHub/GitLab and pick the Novari repo.
3. Build settings:
  - **Framework preset:** Vite (or None — we set commands manually).
  - **Build command:** `corepack enable && pnpm install --frozen-lockfile && pnpm build`
  - **Build output directory:** `dist`
  - **Root directory:** (leave blank = repo root)
  - **Environment variables** (set under **Settings → Environment variables**, for **Production** *and* **Preview**):
    - `VITE_API_URL` = `https://novari-api.up.railway.app` (your backend URL from Section 6 — **no trailing slash, no `/api**`)
    - `NODE_VERSION` = `22` (Vite 8 needs Node 20.19+; 22 is safe)
4. **Save and Deploy.** Cloudflare runs `pnpm build` and ships `dist/` to its global CDN.

> Vite inlines `VITE_API_URL` into the JS bundle **at build time**. If you change it later, you
> must trigger a rebuild (push a commit, or click **Retry deployment**) — the running site won't
> pick it up from the dashboard alone.

### 7.2 SPA routing (so `/products/:id` works on refresh)

The frontend is a single-page app. Direct visits to `/products/01` must still return `index.html`,
not a 404. Create `**public/_redirects**` in the repo root (Vite copies `public/` into `dist/`):

```
/*    /index.html   200
```

This one file works for **both Cloudflare Pages and Netlify**. Static files (`/assets/...`,
`/index.html`) are served first; only unmatched paths fall back to `index.html`. Commit it and
rebuild.

### 7.3 Verify

Open your Cloudflare Pages URL, e.g. `https://novari.pages.dev`:

- Home should load products from the API.
- Refresh on `/products/01` — should not 404 (validates the SPA fallback).
- Open `/admin`, log in with the admin user you created in Section 6.3.

If products don't load, open browser DevTools → Network → the `/api/products/` request. Common
fixes are in Section 10 (CORS / mixed content / wrong `VITE_API_URL`).

### 7.4 Alternatives

#### Netlify

1. [https://app.netlify.com](https://app.netlify.com) → **Add new site → Import from Git** → pick repo.
2. **Base directory:** (blank). **Build command:** `corepack enable && pnpm install --frozen-lockfile && pnpm build`. **Publish directory:** `dist`.
3. **Environment variables:** `VITE_API_URL`, `NODE_VERSION=22`.
4. The same `public/_redirects` file from 7.2 handles SPA routing.

#### Vercel (Pro plan required for a store)

1. [https://vercel.com](https://vercel.com) → **Add New → Project** → import repo.
2. Vercel auto-detects Vite. Set **Environment Variables**: `VITE_API_URL`, `NODE_VERSION=22`.
3. For SPA routing add `**vercel.json**` at repo root:
  ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
  ```
4. ⚠️ Deploy on the **Pro plan ($20/mo)** — the Hobby plan's terms forbid commercial stores.

---

## 8. Custom domains, DNS & HTTPS

Once both halves work on the free subdomains, point your real domains at them.

### 8.1 Frontend → `https://yourdomain.com`

In Cloudflare Pages → **Custom domains** → **Set up a custom domain** → enter `yourdomain.com`
(and `www.yourdomain.com`). Follow the DNS instructions (add a CNAME/A record, or if the domain is
on Cloudflare it's automatic). HTTPS is issued automatically.

### 8.2 Backend → `https://api.yourdomain.com`

In Railway → service **Settings → Networking → Generate Domain**, then add a custom domain and
create a DNS `CNAME` record pointing `api.yourdomain.com` → the Railway domain. HTTPS is
automatic. (On Render: Settings → Custom Domains. On Fly: `flyctl certs add api.yourdomain.com`.)

### 8.3 Update env vars to the custom domains (important!)

After DNS propagates, update — **on both services** — to the custom domains, then redeploy:


| Where                       | Variable                      | New value                                           |
| --------------------------- | ----------------------------- | --------------------------------------------------- |
| Backend (Railway)           | `DJANGO_ALLOWED_HOSTS`        | `api.yourdomain.com`                                |
| Backend (Railway)           | `DJANGO_CORS_ALLOWED_ORIGINS` | `https://yourdomain.com,https://www.yourdomain.com` |
| Frontend (Cloudflare Pages) | `VITE_API_URL`                | `https://api.yourdomain.com`                        |


Then **rebuild the frontend** (push a commit or "Retry deployment") so the new `VITE_API_URL` is
baked into the bundle.

---

## 9. Media & uploaded images (important — read this)

The React admin uploads product images via `POST /api/admin/upload/`. Django saves them to
`MEDIA_ROOT` (a local folder). **On Railway/Render/Fly the filesystem is ephemeral — anything
written there is erased on every redeploy**, and isn't shared across instances. So uploaded
product images will vanish unless you do one of the following.

### Option A (recommended): Cloudflare R2 + `django-storages`

R2 is S3-compatible, has 10 GB free and **free egress** (no bandwidth charges).

1. Cloudflare dashboard → **R2** → enable (needs a card, but free tier covers a small store).
2. **Create bucket** `novari-media`. **R2 → Manage R2 API Tokens** → create a token with Object
  Read & Write. Note: Access Key ID, Secret Access Key, Account ID, and the S3 endpoint
   `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.
3. (Optional, better) Make the bucket public: R2 → bucket → **Settings → Public access** (or a
  custom domain `media.yourdomain.com`).
4. Add to `Novari/requirements.txt`:
  ```txt
   django-storages[s3]>=1.14
  ```
5. Add `'storages'` to `INSTALLED_APPS` in `settings.py`.
6. Add to `settings.py` (Django 6 uses the `STORAGES` setting):
  ```python
   STORAGES = {
       "default": {
           "BACKEND": "storages.backends.s3.S3Storage",
       },
       "staticfiles": {
           "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
       },
   }

   AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
   AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
   AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_STORAGE_BUCKET_NAME', 'novari-media')
   AWS_S3_ENDPOINT_URL = os.environ.get('AWS_S3_ENDPOINT_URL')   # R2 endpoint
   AWS_S3_REGION_NAME = os.environ.get('AWS_S3_REGION_NAME', 'auto')
   AWS_S3_ADDRESSING_STYLE = 'path'
   AWS_S3_FILE_OVERWRITE = False
   AWS_QUERYSTRING_AUTH = False
   MEDIA_URL = os.environ.get('MEDIA_URL', '/')  # or your R2 public URL
  ```
7. Set these env vars on the backend (Railway):
  - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
  - `AWS_STORAGE_BUCKET_NAME=novari-media`
  - `AWS_S3_ENDPOINT_URL=https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
8. Redeploy. Now `POST /api/admin/upload/` returns a permanent R2 URL that loads on the storefront
  and survives every redeploy.

### Option B: a persistent volume (Railway/Render/Fly all support these)

Attach a volume to the backend service and set `MEDIA_ROOT` to it. Files persist across deploys
but are tied to one instance/region and there's no CDN. Fine for a tiny catalog; use R2 once you
have more than a handful of products.

### Option C: VPS with Nginx (Section 7D)

On your own server the disk is persistent — Nginx serves `/media/` directly from a real folder.
No object storage needed.

> Without **one** of A/B/C, any image an admin uploads will be gone after the next deploy. Don't
> skip this section.

---

## 10. First-deployment runbook (checklist)

Do these in order, once, after both services are up:

1. [ ] Backend deployed; `https://<api-url>/api/products/` returns JSON (`[]` is fine).
2. [ ] Migrations ran (Procfile `release`, or `python manage.py migrate` manually).
3. [ ] Production admin user created (`manage.py shell -c "...set_password('...')..."`).
4. [ ] Frontend built with `VITE_API_URL` = the backend URL; `https://<storefront>/` shows products.
5. [ ] `/products`, `/products/:id`, cart drawer, `/checkout` all work end to end.
6. [ ] Refresh on a deep link (e.g. `/products/01`) — no 404 (SPA fallback works).
7. [ ] `/admin` login works; token persists on refresh; logout clears it.
8. [ ] **Media test:** upload an image in admin, save the product, confirm the image shows on the
  storefront. If it 404s after a redeploy, you skipped Section 9.
9. [ ] CORS preflight succeeds (no CORS errors in browser DevTools → Network).
10. [ ] No mixed-content warnings (everything is HTTPS).
11. [ ] (Optional) Custom domains set up per Section 8; env vars updated; frontend rebuilt.
12. [ ] Put the admin password and DB credentials in a password manager. Hand them over securely
  — **never** commit them to the repo.

---

## 11. Updating, rolling back, monitoring

### Updating

- **Frontend:** push to your main branch → Cloudflare Pages rebuilds and deploys automatically.
Changing `VITE_API_URL` requires a rebuild.
- **Backend:** push to main → Railway rebuilds. The `release` line runs migrations. If a migration
is risky, run it manually first via the Railway Terminal.

### Rolling back

- **Cloudflare Pages:** Deployments list → any previous deploy → **Rollback to this deployment**.
- **Railway:** Deployments tab → a previous deployment → **Rollback** (redeploys that build).
- **Database:** keep backups. Neon keeps point-in-time history (free tier: 7 days; paid: 30 days).
Schedule a logical backup too: `pg_dump $DATABASE_URL -F c -f novari.dump`.

### Monitoring

- Railway **Deploy Logs** + **Metrics** (CPU/RAM) show backend health.
- Cloudflare Pages **Deployments** + Cloudflare **Analytics** for traffic/errors.
- Add an uptime check (UptimeRobot, Better Stack — both have free tiers) on the storefront URL and
`/api/products/`.
- For errors, integrate Sentry (free tier) — add `sentry-sdk` to the backend and the frontend.

---

## 12. Troubleshooting (most common issues)


| Symptom                                                               | Likely cause                                                                | Fix                                                                                                  |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Frontend loads but no products; console shows CORS error              | Backend `DJANGO_CORS_ALLOWED_ORIGINS` doesn't include the storefront origin | Add the exact origin (with `https://`) to the backend env var; redeploy backend                      |
| CORS error mentions "credentials" / wildcard                          | Origin must be an explicit URL, not `*` (we send `Authorization`)           | Set the full origin string                                                                           |
| `DisallowedHost at /` (Django 400 page)                               | `DJANGO_ALLOWED_HOSTS` doesn't include the backend hostname                 | Add the API hostname to `DJANGO_ALLOWED_HOSTS`                                                       |
| `RuntimeError: DJANGO_SECRET_KEY is not set`                          | Missing env var on backend                                                  | Set `DJANGO_SECRET_KEY` (strong value) in backend env                                                |
| `RuntimeError: DB_PASSWORD is not set` (if not using dj_database_url) | Missing DB env                                                              | Set the `DB_*` vars (or `DATABASE_URL` with Section 4.4 option B)                                    |
| 502 / "Bad Gateway" on backend                                        | Gunicorn not started, or wrong start command, or wrong root dir             | Confirm Root Directory = `Novari` and Start Command = `gunicorn Novari.wsgi:application`; check logs |
| `/products/01` 404s on refresh                                        | Missing SPA fallback                                                        | Add `public/_redirects` (Section 7.2) and rebuild frontend                                           |
| Mixed-content warnings (HTTP blocked on HTTPS site)                   | `VITE_API_URL` is `http://...`                                              | Set it to `https://api.yourdomain.com`; rebuild frontend                                             |
| Uploaded image 404s after a redeploy                                  | Ephemeral filesystem — skipped Section 9                                    | Set up R2 + django-storages (Option A)                                                               |
| `pnpm install` fails in CI (policy)                                   | `pnpm-workspace.yaml` `minimumReleaseAge` blocks fresh packages             | Use `--frozen-lockfile` (respects the committed lockfile); or temporarily raise the policy           |
| Backend takes ~15–30 s on first request (Render free)                 | Cold start from idle                                                        | Upgrade Render to Starter, or move backend to Railway                                                |
| DB query hangs ~1 s after idle (Neon free)                            | Neon scaled to zero                                                         | Normal; wakes in ~1 s. Upgrade Neon for always-on                                                    |


---

## 13. Cost summary


| Stack                                                              | Monthly cost | Notes                                                              |
| ------------------------------------------------------------------ | ------------ | ------------------------------------------------------------------ |
| **Recommended** (Cloudflare Pages + Railway + Neon + R2)           | **~$5**      | Railway only paid piece; free tiers cover the rest at small scale  |
| Budget ($0, with caveats) (Cloudflare Pages + Render free + Neon)  | $0           | Render free cold-starts (15 min idle) — not ideal for a real store |
| VPS everything (Hetzner + Nginx + Gunicorn + Postgres on same box) | ~$4–6        | Cheapest always-on at scale; you manage the server                 |
| Enterprise (Cloudflare Pages + Railway + AWS RDS + R2)             | $20+         | Best uptime/scale; managed DB                                      |


---

## 14. Quick reference — the deploy order

```
1. Push repo to GitHub/GitLab (with Section 4 prep committed).
2. Create Neon DB            → copy DB connection values.
3. Deploy backend on Railway → set env vars → migrate → create admin → note the API URL.
4. Set up media (R2)         → so uploads survive (Section 9).
5. Build frontend on Cloudflare Pages → VITE_API_URL = API URL from step 3.
6. Add public/_redirects     → rebuild frontend (SPA routing).
7. Smoke test everything     → Section 10 checklist.
8. (Optional) Custom domains → Section 8 → update env vars → rebuild frontend.
```

You're live. Hand off credentials via a password manager, and keep `CHECKLIST.md` for the full
pre-launch/sign-off list.