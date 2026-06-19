# Novari — Client Handoff & Production Checklist

Use this list before delivering the project files and before going live. Check items off as you complete them.

**Stack:** React 19 + Vite 8 (`main` branch) · Django 6 + DRF + PostgreSQL (`backend-system` branch)

> Backend source, env files, and backend-specific checklist items live on **`backend-system`**. This checklist covers the frontend repo on **`main`**.

---

## 1. Repository & delivery

- [x] Initialize git (if not already) and create a clean initial commit
- [x] Confirm `.gitignore` excludes secrets and generated artifacts:
  - [x] Root: `node_modules/`, `dist/`, `*.local` (covers `.env.local`)
  - [x] Backend: `Novari/.venv/`, `Novari/media/`, `Novari/__pycache__/`
  - [x] Add `Novari/.env` to `Novari/.gitignore` if not already present
- [ ] Do **not** include in the handoff archive:
  - [ ] `node_modules/`
  - [ ] `dist/` (client rebuilds in CI or on the server)
  - [ ] `Novari/.venv/`
  - [ ] `.env.local`, `Novari/.env`, or any file with real credentials
  - [ ] IDE folders (`.idea/`, `.vscode/` except shared extensions config)
- [ ] Include these docs for the client:
  - [ ] `CHECKLIST.md` (this file)
  - [ ] `docs/frontend-backend-integration.md`
  - [ ] `DESIGN.md`
  - [ ] `.env.example` and `Novari/.env.example`
- [ ] Remove or clearly label internal-only artifacts if shipping a zip (optional):
  - [ ] `plans/` — developer handoff notes
  - [ ] `docs/superpowers/` — planning drafts
  - [ ] `docs/novari-integration-handoff.md` — session notes for agents

---

## 2. Secrets & environment variables

### Frontend (build-time)

Create `.env.local` locally; in production set these in the hosting/CI environment before `pnpm build`:

| Variable | Dev example | Production |
|----------|-------------|------------|
| `VITE_API_URL` | `http://localhost:8000` | `https://api.yourdomain.com` (Django origin, **no trailing slash**, **no `/api` suffix**) |

- [ ] Production `VITE_API_URL` points to the live API origin
- [ ] Rebuild the frontend after changing `VITE_API_URL` (Vite inlines env at build time)

### Backend (runtime)

Copy `Novari/.env.example` → `Novari/.env` on the server. **Never commit `.env`.**

| Variable | Required in prod | Notes |
|----------|------------------|-------|
| `DJANGO_SECRET_KEY` | Yes | Generate with `python -c "import secrets; print(secrets.token_urlsafe(50))"`. Settings raise if unset. |
| `DJANGO_DEBUG` | Yes | Set `false` in production. Defaults to `false`; `true` is dev only. |
| `DJANGO_ALLOWED_HOSTS` | Yes | Comma-separated API host(s), e.g. `api.yourdomain.com` |
| `DJANGO_CORS_ALLOWED_ORIGINS` | Yes | Comma-separated storefront origin(s), e.g. `https://yourdomain.com` |
| `DB_NAME` | Yes | |
| `DB_USER` | Yes | |
| `DB_PASSWORD` | Yes | Strong password; settings raise if unset. Must match `docker-compose.yml` (both read `.env`). |
| `DB_HOST` | Yes | Managed Postgres hostname or private network host |
| `DB_PORT` | Yes | `5432` on most hosts; dev Docker uses **5433** on localhost |

- [x] All production secrets live in environment variables only
- [x] `settings.py` has no secret fallbacks — `SECRET_KEY` and `DB_PASSWORD` raise if unset; `DEBUG` defaults to `false`

---

## 3. Backend production hardening

File: `Novari/Novari/settings.py`

- [x] Set `DEBUG = False` in production (env-driven: `DJANGO_DEBUG=false`; defaults to `false`)
- [ ] Set `ALLOWED_HOSTS` to the API domain(s) via `DJANGO_ALLOWED_HOSTS` (mechanism in place; set your domain in prod `.env`)
- [ ] Set `CORS_ALLOWED_ORIGINS` to the storefront origin(s) via `DJANGO_CORS_ALLOWED_ORIGINS` (mechanism in place; set your origin in prod `.env`)
- [x] Remove or override hardcoded dev `SECRET_KEY` fallback — removed; settings raise if unset
- [x] Remove or override hardcoded dev `DB_PASSWORD` fallback — removed; settings raise if unset
- [ ] Serve over HTTPS only (reverse proxy / load balancer terminates TLS)
- [x] Configure Django behind a reverse proxy if needed (`SECURE_PROXY_SSL_HEADER`, `USE_X_FORWARDED_HOST` set when `DEBUG=false`; deploy the proxy itself)
- [x] Enable standard production security headers (`SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, HSTS, etc. — active when `DEBUG=false`)
- [x] Run Django deployment checks (passes with 0 issues when `DJANGO_DEBUG=false` + a strong `DJANGO_SECRET_KEY`):
  ```bash
  cd Novari
  python manage.py check --deploy
  ```
- [ ] Use a production WSGI/ASGI server (e.g. Gunicorn + Nginx), not `runserver`

---

## 4. Database

- [ ] Provision PostgreSQL (managed service or self-hosted)
- [ ] Apply migrations on the production database:
  ```bash
  cd Novari
  python manage.py migrate
  ```
- [ ] Confirm all migrations applied (latest: `0006_remove_order_country`)
- [ ] Set up automated database backups and a restore test
- [ ] Restrict DB network access (private subnet / allowlist only)

### Initial data

- [ ] Seed catalog **or** import real products via admin:
  ```bash
  python manage.py seed_products   # dev/sample data only — review before prod
  ```
- [ ] Create production admin user(s) with strong passwords:
  ```bash
  python manage.py shell -c "from novari_base.models import User; u=User(email='admin@example.com', name='Admin', role=User.ROLE_ADMIN); u.set_password('REPLACE_WITH_STRONG_PASSWORD'); u.save()"
  ```
- [x] `seed_products` no longer hardcodes `changeme123` (reads `SEED_ADMIN_PASSWORD` or auto-generates a random password). If the **old** seed was ever run in prod, rotate that admin's password.
- [ ] Delete or disable any test admin accounts

---

## 5. Media & uploaded images

Development serves uploads from Django when `DEBUG=True`. Production requires explicit setup.

- [ ] Choose a media strategy:
  - **Option A:** Same-origin — API serves `/media/` via Nginx + persistent volume on the app server
  - **Option B (recommended at scale):** Object storage (S3, GCS, etc.) + CDN; update upload/view code or storage backend accordingly
- [ ] Ensure `MEDIA_ROOT` / `MEDIA_URL` (or cloud storage) persist across deploys
- [ ] Confirm admin image upload (`POST /api/admin/upload/`) returns URLs that work on the live storefront
- [ ] Migrate or re-upload product images if URLs still point to `http://localhost:8000/media/...`
- [ ] Set upload limits and monitoring (current max: 5 MB; types: JPEG, PNG, WebP)

Static product images in `public/assets/` are served by the frontend host and do not need Django media.

---

## 6. Frontend production build & hosting

- [ ] Install dependencies: `pnpm install`
- [x] Lint and build (both pass):
  ```bash
  pnpm lint && pnpm build
  ```
- [ ] Deploy contents of `dist/` to static hosting (Vercel, Netlify, S3+CloudFront, Nginx, etc.)
- [ ] Configure SPA fallback: all routes (`/`, `/products`, `/products/:id`, `/checkout`, `/admin`) must serve `index.html`
- [ ] Enable HTTPS on the storefront domain
- [ ] Verify fonts and `/assets/...` images load on production
- [ ] Optional: address bundle size warning (~500 kB main chunk) via code-splitting if performance matters

**Do not re-add a Vite dev proxy** for `/admin` or `/products` — the SPA handles those routes; API calls go directly to Django via CORS.

---

## 7. DNS, domains & CORS

Typical layout:

| Service | Example URL |
|---------|-------------|
| Storefront | `https://yourdomain.com` |
| API | `https://api.yourdomain.com` |
| Django built-in admin (optional) | `https://api.yourdomain.com/django-admin/` |

- [ ] DNS A/CNAME records for storefront and API
- [ ] TLS certificates issued and auto-renewing (Let's Encrypt, cloud provider, etc.)
- [ ] `VITE_API_URL=https://api.yourdomain.com` used at frontend build time
- [ ] `CORS_ALLOWED_ORIGINS` includes `https://yourdomain.com` (and `www` if used)
- [ ] `ALLOWED_HOSTS` includes the API hostname

---

## 8. Admin & authentication

Two separate admin surfaces:

| UI | URL (dev) | Purpose |
|----|-----------|---------|
| React admin | `https://yourdomain.com/admin` | Product CRUD, image upload, order list |
| Django admin | `https://api.yourdomain.com/django-admin/` | Low-level DB access (optional) |

- [ ] Production admin password(s) set and documented securely (password manager, not email/chat)
- [x] Admin tokens expire after 30 days (`TOKEN_MAX_AGE` in `views.py`); admins re-login when expired
- [x] Logout works (`POST /api/admin/logout/` invalidates server token; client clears `localStorage`)
- [ ] Restrict `/admin` route if desired (IP allowlist at CDN, basic auth on staging, etc.)

---

## 9. Client content & configuration

These are still placeholders or dev defaults in the codebase — update before launch:

- [ ] **Footer social links** — `src/components/Footer.tsx` uses `url: "#"` for Instagram, Facebook, WhatsApp
- [ ] **Footer shop links** — category links (`T-Shirts`, `Hoodies`) must match real catalog categories
- [ ] **Product images** — replace placeholder `/assets/T-shirt placeholder.webp` where needed
- [ ] **Real product catalog** — enter via React admin or import; remove sample seed products if inappropriate
- [ ] **Sizes** — still defined statically in `src/data/sizes.ts` (not API-driven); confirm sizes match inventory workflow
- [ ] **Colors metadata** — partly static in `src/data/colors.ts`; admin can set product colors via API
- [ ] **Brand copy** — hero, about, footer text in page components
- [ ] **Contact / support** — WhatsApp or email the client wants customers to use

---

## 10. Payments & orders

- [x] **Cash on delivery** — only active payment method today (`cod`)
- [x] **Card payments** — UI exists but is **disabled** (`src/components/BillingForm.tsx`, `disabled: true`). Integrate a payment gateway (Stripe, Paymob, etc.) before enabling, or remove the option from the UI
- [x] Orders are stored in PostgreSQL (`Order` model) with line items as JSON
- [x] Admin can view orders in React admin (`GET /api/admin/orders/`)
- [ ] Define client workflow: who gets notified on new order (email, webhook, manual admin check)
- [ ] Optional: order confirmation email to customer (not implemented)

---

## 11. Pre-launch QA (acceptance testing)

Run against **production-like** staging first, then repeat on live after deploy.

### Storefront

- [ ] Home page loads products from API
- [ ] `/products` — grid, filters, sort work
- [ ] `/products/:id` — detail, color/size selection, add to cart
- [ ] Cart drawer — add, update quantity, remove
- [ ] `/checkout` — form validation, order submission, success message, cart clears
- [ ] 404 page for invalid product IDs
- [ ] Mobile layout and sticky navbar behave correctly
- [ ] Intro animation and scroll reveals work (or degrade gracefully with reduced motion)

### Admin

- [ ] Login with production credentials
- [ ] Token persists on page refresh; expires/re-login after 30 days
- [ ] Create, update, delete product
- [ ] Image upload returns a working URL; image visible on storefront after catalog reload
- [ ] Order list shows submitted checkout orders
- [ ] Logout clears session

### API smoke test

| Endpoint | Method | Auth |
|----------|--------|------|
| `/api/products/` | GET | Public |
| `/api/products/:id/` | GET | Public |
| `/api/admin/login/` | POST | Public |
| `/api/admin/logout/` | POST | Token |
| `/api/admin/products/` | GET, POST | Token |
| `/api/admin/products/:id/` | PATCH, DELETE | Token |
| `/api/admin/upload/` | POST multipart `image` | Token |
| `/api/admin/orders/` | GET | Token |
| `/api/orders/` | POST | Public |

- [ ] All endpoints respond correctly on production URLs
- [ ] CORS preflight succeeds from the storefront origin
- [ ] No mixed-content warnings (all HTTPS)

### Automated checks (developer)

```bash
pnpm lint && pnpm build
cd Novari && python manage.py test novari_base
```

- [x] Frontend lint + build pass
- [x] Backend tests pass (6 tests in `novari_base/tests/test_api.py`; expand coverage as needed)

---

## 12. Operations & post-launch

- [ ] Document how to deploy frontend and backend updates
- [ ] Document rollback procedure
- [ ] Set up error/logging monitoring (Sentry, cloud logs, etc.)
- [ ] Set up uptime monitoring for storefront and API
- [ ] Schedule Postgres backups; test a restore
- [ ] Plan disk usage for `media/` uploads
- [ ] Document how to create additional admin users
- [ ] Hand off credentials via a secure channel (not in the repo)

---

## 13. Known limitations (set expectations)

Communicate these to the client so there are no surprises:

| Item | Status |
|------|--------|
| Card / online payments | Not integrated — COD only |
| Order emails | Not implemented |
| Frontend automated tests | None |
| Backend test coverage | Minimal (4 API tests) |
| Product sizes | Static list in frontend, not stored per product in API |
| Inventory deduction on order | Orders saved; stock counts not auto-decremented |
| Multi-image drag-and-drop in admin | Basic upload only |
| SEO / meta tags / sitemap | Review and add if required |
| Analytics (GA, etc.) | Not included |
| i18n / multi-language | English only |
| Rate limiting / abuse protection on public endpoints | Not implemented |

---

## 14. Quick reference — local dev (for client onboarding)

```powershell
# Terminal 1 — database + API
cd Novari
copy .env.example .env          # one-time: create your local env file
docker compose up -d
.\.venv\Scripts\python manage.py migrate
.\.venv\Scripts\python manage.py seed_products
.\.venv\Scripts\python manage.py runserver

# Terminal 2 — frontend
cd C:\Projects\novari
pnpm install
pnpm dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:8000/api/...`
- Postgres (Docker): host port **5433**
- Seed admin: `admin@novari.test` — password is auto-generated and printed by `seed_products` (or set `SEED_ADMIN_PASSWORD` in `.env` to a known value)

Full details: `docs/frontend-backend-integration.md`

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| Client | | | |

**Production go-live approved:** ☐ Yes ☐ No — blockers: _______________
