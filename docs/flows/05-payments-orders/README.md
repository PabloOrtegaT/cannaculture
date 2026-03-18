# 05 Identity, Cart Sync, Payments, and Orders Flow Docs

Add docs for:

- Auth lifecycle (email/password login, email verification, password reset, social login callbacks).
- Session-based RBAC boundaries for admin routes/actions.
- Dedicated admin host policy and host-level route boundaries.
- Guest/authenticated cart synchronization and merge behavior.
- Checkout flow and totals with coupon application.
- Payment lifecycle and webhook idempotency.
- Antifraud controls and risk-review operations.
- Order status transitions and admin evidence handling.

## Implemented in this phase

- `auth-lifecycle-and-rbac-flow.md`
- `guest-cart-merge-flow.md`

## Pending for next phase

- Checkout/payment provider lifecycle flow.
- Webhook idempotency and order-status transition flow.
- Risk/review operations flow.
