# Testing Guide

## Test stack

- Unit and component tests: Vitest + React Testing Library
- Endpoint/integration tests: Vitest route-handler suites
- End-to-end tests: Playwright

## Commands

```bash
npm run test
```

Runs workspace unit/component tests.

```bash
npm run test:e2e
```

Runs Playwright end-to-end tests (requires browser installation with `npx playwright install` when needed).

```bash
npm run test:coverage:target
```

Prints a non-blocking global stretch report for 100% coverage after the main test run.

## Coverage policy (D04b/D05)

- Hard gate: `90%` on the gated-scope modules for `lines`, `branches`, `functions`, `statements`.
- Stretch target: `100%` on the same gated scope (reporting-only, non-blocking).
- Gated coverage scope:
  - `src/app/api/**/route.ts`
  - `src/app/(admin)/admin/actions.ts`
  - `src/server/admin/mutation-errors.ts`
  - `src/server/admin/role-guard.ts`
  - `src/server/admin/stock-mode.ts`
  - `src/server/config/host-policy.ts`

## Ownership expectations

- Every new/changed CRUD action/endpoint must ship with route/action/service tests in the same change set.
- Expected domain failures must be asserted as sanitized outcomes (JSON error payload or toast/redirect flow), not raw unhandled 500 behavior.
- Coverage matrix reference: `docs/testing/crud-endpoint-coverage-matrix.md`.
