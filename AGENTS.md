# AGENTS.md — Novari

Compact guidance for OpenCode sessions working on this repo.

## Stack & entrypoints

- **Package manager:** `pnpm` (lockfile + `pnpm-workspace.yaml` policies are active).
- **Framework:** React 19 + TypeScript + Vite 8.
- **Routing:** `react-router` v7 **library mode** (`createBrowserRouter` in `src/App.tsx`).
- **Styling:** Tailwind CSS v4 configured in `src/index.css` via `@import 'tailwindcss'` and `@config "../tailwind.config.ts"`.
- **Animation:** Framer Motion. Always import the lazy proxy `m` (not `motion`) because the app is wrapped in `<LazyMotion features={domAnimation}>` inside `src/components/MotionProvider.tsx`. `MotionConfig reducedMotion="user"` is already configured.
- **Design system:** All tokens, colors, typography, and component specs are in `DESIGN.md`. Read it before adding new UI.

## Fallow

- Use `fallow audit --format json --quiet` before committing AI-generated changes.
- Use `fallow dead-code --format json --quiet`, `fallow dupes --format json --quiet`, and `fallow health --format json --quiet` for targeted checks.
- Use `fallow list --entry-points --format json --quiet` and `fallow list --boundaries --format json --quiet` to inspect project shape.

## Commands

```bash
pnpm dev      # Vite dev server
pnpm build    # tsc -b && vite build (type-checks first)
pnpm lint     # eslint .
pnpm preview  # preview production build
```

There are no tests yet; verify with `pnpm lint && pnpm build`.

## Backend integration

- Django API lives on the **`backend-system`** branch (backend-only; Django at repo root in that checkout). This branch is frontend-only.
- REST endpoints are under the `/api/` prefix (e.g. `GET /api/products/`). Set `VITE_API_URL=http://localhost:8000` in `.env.local` (see `.env.example`); API module paths include the `/api/` segment. No Vite dev proxy — requests go directly to Django (CORS).
- Run the backend locally: `git checkout backend-system`, then follow `README.md` in that branch.
- Frontend API docs: `docs/frontend-backend-integration.md`.

## TypeScript conventions

- Project uses TypeScript project references (`tsconfig.json` → `tsconfig.app.json` + `tsconfig.node.json`).
- `verbatimModuleSyntax: true` — use `import type { ... }` for type-only imports.
- `noUnusedLocals` and `noUnusedParameters` are enabled; unused variables fail `pnpm build`.
- `allowImportingTsExtensions: true` with `noEmit: true` — component imports may keep `.tsx`/`.ts` extensions.

## Component / code organization

- `src/pages/` — route-level pages (`Home`, `ProductDetail`).
- `src/components/` — reusable UI.
  - `src/components/primitives.tsx` — shared `Button`, `ButtonLink`, `TextLink`, `NavButton`, `RouterLink`.
  - `src/components/Reveal.tsx` — viewport reveal wrapper for scroll animations.
  - No barrel file (`src/components/index.ts` was removed); import directly from source files.
- `src/data/products.ts` — single source of truth for product catalog.
- `src/hooks/` — shared hooks (e.g., `useIntroAnimation`).
- `public/assets/` — static images served from `/assets/...`. There is no `@assets` alias.

## Styling rules from DESIGN.md

- Colors: `obsidian` (#070707), `charcoal` (#141414), `cream` (#BABABA), `gold` (#7A6751).
- Global `border-radius: 0` reset. Do not add rounded corners.
- Uppercase + wide tracking for UI text; `font-display` for editorial headings; `font-script` only for the hero word.
- Product grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`.
- Hero: `lg:grid-cols-hero` (4fr / 6fr), height `max-h-hero` = `calc(100svh - 4.5rem)`.

## pnpm / security policy

`pnpm-workspace.yaml` enforces supply-chain policies:

```yaml
minimumReleaseAge: 1440   # 1 day; raise to 10080 (7 days) once lockfile ages
trustPolicy: no-downgrade
overrides:
  semver: ^7.6.3
```

Use `pnpm install`. If policy checks fail after dependency updates, inspect `pnpm-lock.yaml` or temporarily adjust the policy; do not silently disable it.

## Gotchas

- `eslint-plugin-react-hooks` v7 is strict: do not call `setState` directly in an effect body. Prefer derived state or `useCallback` patterns.
- `StrictMode` is enabled; components will double-render in development.
- The navbar is sticky and the intro animation measures the navbar logo position via `useLayoutEffect`; do not change the navbar layout without checking `IntroAnimation.tsx`.
