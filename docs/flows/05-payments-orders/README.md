# 05 Identity, Cart Sync, Payments, and Orders Flow Docs

Add docs for:

- Auth lifecycle (email/password login, email verification, password reset, social login callbacks).
- Session-based RBAC boundaries for admin routes/actions.
- Dedicated admin host policy and host-level route boundaries.
- Guest/authenticated cart synchronization and merge behavior.
- Checkout flow and totals with coupon application.
- Inventory validation and payment-time stock decrement lifecycle.
- Payment lifecycle and webhook idempotency.
- Antifraud controls and risk-review operations.
- Order status transitions and admin evidence handling.

## Implemented in this phase

- `auth-lifecycle-and-rbac-flow.md`
- `guest-cart-merge-flow.md`
- `checkout-and-provider-lifecycle-flow.md`
- `webhook-idempotency-order-transition-flow.md`

### Phase 2 status note

- Checkout validates current stock at session creation and returns deterministic `409` stock conflicts.
- `POST /api/checkout/session` no longer returns hold metadata.
- Webhooks stay idempotent and decrement inventory on successful payment only.

## Deferred to forks

- Risk/review operations (3DS, velocity checks, high-risk review queue) — provider-specific and business-specific. Add in the fork, not the base.
