# Frontend ↔ Backend Integration

This branch (`main`) is the Vite React storefront and admin UI. The Django REST API lives on the **`backend-system`** branch (backend-only repo at that branch's root).

## Environment

### Frontend (`.env.local`)

Copy `.env.example` to `.env.local` and set:

```env
VITE_API_URL=http://localhost:8000
```

`VITE_API_URL` is the Django origin (no trailing slash). API modules call paths like `/api/products/`, so requests resolve to `http://localhost:8000/api/products/`.

API requests go **directly** to Django via `VITE_API_URL` (CORS must allow your storefront origin). There is **no Vite dev proxy** — do not re-add one. React routes such as `/admin` and `/products` live on the Vite server; proxying those paths to Django would break the SPA.

## Local development

**Terminal 1 — backend** (separate clone or worktree on `backend-system`):

```bash
git checkout backend-system
copy .env.example .env
docker compose up -d
.\.venv\Scripts\python manage.py migrate
.\.venv\Scripts\python manage.py seed_products
.\.venv\Scripts\python manage.py runserver
```

See `README.md` on **`backend-system`** for full backend env vars and setup options.

**Terminal 2 — frontend** (this branch):

```bash
pnpm install
pnpm dev
```

## API mapping

All REST endpoints are under the `/api/` prefix.

| Frontend need | Endpoint | Auth |
|---------------|----------|------|
| Product catalog | `GET /api/products/` | Public |
| Product detail | `GET /api/products/:id/` | Public |
| Admin login | `POST /api/admin/login/` | Public |
| Admin logout | `POST /api/admin/logout/` | `Authorization: <token>` |
| Admin catalog | `GET /api/admin/products/` | Token |
| Create product | `POST /api/admin/products/` | Token |
| Update product | `PATCH /api/admin/products/:id/` | Token |
| Delete product | `DELETE /api/admin/products/:id/` | Token |
| Image upload | `POST /api/admin/upload/` | Token |
| Submit order | `POST /api/orders/` | Public |

Admin auth accepts `Authorization: Bearer <token>` or a raw token. Logout invalidates the server-side token; the frontend should also clear `localStorage`.

## Image upload

Admin image upload uses `POST /api/admin/upload/`:

- **Content-Type:** `multipart/form-data`
- **Field:** `image` (image file)
- **Auth:** `Authorization: Bearer <token>` or raw token
- **Response:** JSON with a URL (e.g. `{ "url": "/media/products/..." }`) to include in the product `images` array

Uploaded files are stored under `MEDIA_ROOT` and served at `MEDIA_URL` in development when Django media serving is enabled. Prefer upload URLs over hard-coded `/assets/...` paths for admin-created products.

## Frontend architecture

- `src/lib/apiClient.ts` — shared `fetch` wrapper and `ApiError`
- `src/lib/env.ts` — `API_BASE_URL` from `VITE_API_URL`
- `src/api/products.ts` — product adapters and public catalog calls
- `src/api/admin.ts` — admin auth, product CRUD, upload, logout
- `src/api/orders.ts` — checkout order submission
- `src/context/ProductProvider.tsx` — shared catalog state for storefront pages
- `src/context/AdminAuthProvider.tsx` — stores admin token in `localStorage`

## Product adapter

Backend fields are normalized in `src/api/products.ts`:

- `price` → `numericPrice`
- `colors` / legacy `color` → `colors[]`
- `images` / legacy `image` → `images[]`
- numeric `id` → zero-padded string (`1` → `"01"`)

Admin inventory fields (`in_stock`, `stock_count`, `sales`) are mapped to `AdminProduct`.

## Verification

```bash
pnpm lint && pnpm build
```

Manual checks (backend must be running from **`backend-system`**):

1. Home and `/products` load catalog data from the API.
2. `/products/:id` resolves a product or shows not found.
3. `/admin` login uses backend credentials and persists token on refresh.
4. Admin logout clears the session (server token + client storage).
5. Admin create/update changes are reflected after catalog reload.
6. Admin image upload returns a URL usable in product `images`.
7. Checkout submits order payload including cart line items.
