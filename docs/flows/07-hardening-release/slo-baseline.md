# SLO Baseline

Baseline service level objectives for the base project. Forks should review and tighten these based on their business requirements.

## Availability targets

| Surface | Target | Rationale |
|---|---|---|
| Storefront (catalog, home) | 99.5% monthly | Read-heavy, CDN-cacheable; brief outages are recoverable |
| Checkout (session creation, payment redirect) | 99.9% monthly | Revenue-critical — failures directly lose sales |
| Admin dashboard | 99.0% monthly | Internal tool; planned maintenance windows acceptable |
| Auth endpoints (login, register, reset) | 99.5% monthly | Degraded UX but not immediate revenue loss |

## Response time targets (p95)

| Endpoint | Target | Notes |
|---|---|---|
| Storefront page load (SSR) | < 2 000 ms | Includes D1 read time on Cloudflare Workers |
| `GET /api/catalog/availability` | < 500 ms | Cached in future phases; single D1 query now |
| `POST /api/cart` | < 1 000 ms | D1 write + reconcile |
| `POST /api/checkout/session` | < 3 000 ms | D1 + outbound provider API call |
| `POST /api/payments/webhook/[provider]` | < 2 000 ms | D1 write + idempotency check |

## Error rate targets

| Endpoint group | Max error rate (5xx) | Notes |
|---|---|---|
| Auth routes | < 0.1% | Excludes expected 4xx (wrong password, expired token) |
| Cart API | < 0.1% | Excludes expected 409 stock conflicts |
| Checkout session | < 0.5% | Provider availability affects this rate |
| Webhook processor | < 0.1% | Idempotency ledger protects against double-processing |

## Incident response thresholds

| Signal | Action |
|---|---|
| Checkout error rate > 1% for 5 minutes | Investigate immediately |
| Auth error rate > 0.5% for 10 minutes | Investigate — may indicate DB or secret misconfiguration |
| Webhook processing lag > 60 seconds | Check provider delivery and D1 write capacity |
| Worker boot error in Cloudflare logs | Deploy rollback if persistent |

## Observability

Current telemetry is console-based (Cloudflare Workers logs via `wrangler tail`):

- `[telemetry]` channel: auth/cart route warnings and errors
- `[admin-audit]` channel: admin mutation success and failure

To harden observability in a fork:

- Forward logs to an external aggregator (Axiom, Datadog, Sentry) by wrapping the telemetry utility in `src/server/observability/telemetry.ts`.
- Set up alerts on checkout 5xx rate using your aggregator's alert rules.
- Add Cloudflare Analytics Engine binding for structured metrics without egress cost.

## What is not covered here

- Multi-region failover (Cloudflare Workers are globally distributed; D1 read replication is future work)
- Payment provider SLOs (governed by Stripe/MP/PayPal agreements separately)
- Persistent audit log retention (console logs only in this phase; add DB or object storage sink in fork)
- Dispute / chargeback SLA (handled directly with payment providers)
