# Testing Guide

## Test strategy

This project uses a two-tier testing approach:

1. **Unit tests (Vitest):** Pure logic only — domain invariants, Zod validation, cart CRUD operations, merge algorithms, formatting functions, and other side-effect-free code.
2. **End-to-end tests (Playwright):** Full user flows through the real application — auth, cart, checkout, admin CRUD, and catalog browsing.

Heavily-mocked integration tests (route handlers, service layers with mocked DB) have been intentionally removed. These created false confidence by validating mock contracts rather than real behavior. Playwright E2E tests provide more reliable coverage of the same flows.

## Commands

```bash
npm run test
```

Runs workspace unit tests (pure logic only).

```bash
npm run test:e2e
```

Runs Playwright end-to-end tests (requires browser installation with `npx playwright install` when needed).
Default fail-fast policy:

- Global run timeout: `120000ms` (2 minutes)
- Web server startup timeout: `90000ms`
- Per-test timeout: `45000ms`
- First failure stops run (`maxFailures: 1`)

Optional overrides:

- `PLAYWRIGHT_GLOBAL_TIMEOUT_MS`
- `PLAYWRIGHT_WEB_SERVER_TIMEOUT_MS`
- `PLAYWRIGHT_TEST_TIMEOUT_MS`
- `PLAYWRIGHT_WEB_SERVER_READY_URL` (override readiness probe URL)
- `PLAYWRIGHT_RUN_DB_BOOTSTRAP=1` (run `db:migrate:local` + `db:seed` before Playwright webServer startup)
- `PLAYWRIGHT_REUSE_EXISTING_SERVER=0|1` (default: `1` locally, `0` in CI)
- `PLAYWRIGHT_DISABLE_WEBSERVER=1` (skip webServer plugin and target an already-running app)
- `PLAYWRIGHT_BASE_URL` / `PLAYWRIGHT_ADMIN_BASE_URL` (override default host-split URLs)
- `PLAYWRIGHT_NEXT_DIST_DIR` (override Playwright-only Next.js dist dir; default `.next-playwright`)

Notes:

- Playwright webServer readiness checks `http://localhost:<PLAYWRIGHT_PORT>` by default (override with `PLAYWRIGHT_WEB_SERVER_READY_URL` when needed).
- Test navigation still uses host-split URLs (`storefront.lvh.me` / `admin.lvh.me`) unless overridden.
- DB bootstrap is skipped by default for faster startup; enable it explicitly with `PLAYWRIGHT_RUN_DB_BOOTSTRAP=1`.
- DB bootstrap runs through `apps/web/scripts/playwright-db-bootstrap.mjs` to avoid shell-specific `npm` startup issues on Windows.
- When another `next dev` is running, prefer an isolated run (example):
  - `PLAYWRIGHT_PORT=3100 PLAYWRIGHT_REUSE_EXISTING_SERVER=0 PLAYWRIGHT_BASE_URL=http://localhost:3100 PLAYWRIGHT_ADMIN_BASE_URL=http://localhost:3100 npm run test:e2e`

## Unit test scope

Unit tests cover **pure functions only** — no mocked databases, no mocked services, no mocked route handlers. Files under `src/__tests__/`:

- `domain/` — attribute validation, invariants, RBAC rules, store profile
- `validation/` — DTO schemas, product input validation
- `storefront/` — cart CRUD logic, merge algorithm, pricing display, home content mapping, profile isolation, theme toggle
- `admin/` — coupon validation, stock mode, mutation error mapping, table columns
- `auth/` — refresh session policy (pure date math)
- `ui/` — button component

## E2E test scope

Playwright tests cover **real user flows** through the running application:

- `auth-flows.spec.ts` — register, login, forgot password, login with wrong credentials
- `storefront-catalog-cart.spec.ts` — browse catalog, add to cart, stock controls, quantity changes
- `storefront-cart-merge.spec.ts` — guest cart merges into authenticated cart on login
- `storefront-checkout-flow.spec.ts` — checkout with mock payment (success + failure), unauthenticated checkout prompt, order appears on account page
- `storefront-admin-entry.spec.ts` — admin link appears for authenticated users
- `admin-categories-crud.spec.ts` — create/edit categories
- `admin-product-crud.spec.ts` — create/edit products and variants

## Ownership expectations

- New features should be validated with E2E tests covering the primary user flow.
- Pure logic (validation, formatting, algorithms) should have unit tests.
- Do not add mocked route/service tests — use Playwright instead.
