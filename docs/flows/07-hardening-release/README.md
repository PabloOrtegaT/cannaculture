# Hardening and Release Flow

## Problem solved

The base project needed a minimum operational hardening baseline so auth/cart/admin mutations fail safely, high-risk paths are throttled, and release/fork operations are repeatable.

## User roles and actors

- Customer user: triggers auth/cart endpoints.
- Admin user: executes protected mutations in admin surfaces.
- Server hardening layer: enforces guards, rate limits, and logs.
- Operator/releaser: runs preflight, tests, and deploy workflows.

## How to use

1. Run quality gates:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test`
   - `npm run test:e2e`
2. For Cloudflare deploy, run:
   - `npm run cf:preflight`
   - `npm run cf:deploy`
3. Review console telemetry and admin audit log output during test/deploy verification.

## How it works

- Rate limiting utility (`src/server/security/rate-limit.ts`) is applied to critical auth/cart routes.
- Telemetry utility (`src/server/observability/telemetry.ts`) emits structured info/warn/error payloads.
- Admin mutations use typed/sanitized error mapping and flash-toast feedback.
- Admin mutation execution logs audit entries via `src/server/admin/audit-log.ts`.
- Host boundary + origin + recent-auth checks are enforced in `src/server/admin/role-guard.ts`.

## Why this approach

- Prioritizes deterministic guardrails without adding external infrastructure dependencies in this phase.
- Keeps sensitive failure information out of end-user responses while preserving operator debugging signals.

## Alternatives considered

- Full external observability stack now (Sentry/Datadog/etc):
  - stronger but out-of-scope for this phase baseline.
- Distributed rate-limit backend now:
  - stronger for multi-instance bursts, planned for later phase.

## Data contracts or schemas involved

- Admin mutation feedback contract: `{ type, code, message }`.
- Cart write API contract: `{ cart, summary, version }` with `409` conflict snapshots.
- Telemetry payload contract: `{ scope, message, metadata?, timestamp }`.

## Failure modes and edge cases

- Repeated auth/cart writes from same client exceed per-minute thresholds (`429`).
- Admin mutation from non-admin origin/host is rejected.
- Stale cart version update returns `409` and requires retry with latest version.

## Observability and debugging

- Telemetry channels:
  - `[telemetry]` for auth/cart and route-level warnings/errors.
  - `[admin-audit]` for admin mutation success/failure.
- Tests:
  - `src/__tests__/security/rate-limit.test.ts`
  - `src/__tests__/observability/telemetry.test.ts`
  - admin/action and route suites under `src/__tests__/admin` and `src/__tests__/api`.

## Security considerations

- Admin writes require server-side RBAC plus host/origin checks.
- Recent-auth window is required for admin `*:write` actions.
- Route handlers return sanitized user-facing failures for expected domain errors.

## Tests that validate this flow

- Unit tests for rate limiting and telemetry helpers.
- Unit/integration tests for admin guard and action error mapping.
- Route tests for auth/cart error paths.
- E2E suites for storefront/admin critical journeys.

## Open questions or future improvements

- Move rate limiting to durable/distributed backing store.
- Persist admin audit log to database/object storage.
- Add production alerting and SLO dashboards.
