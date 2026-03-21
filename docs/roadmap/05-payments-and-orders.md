# Deliverable 05: Identity, Cart Sync, Payments, and Orders

## Objective

Implement customer identity flows and reliable checkout with cart continuity, order lifecycle, and payment event handling.

## Phase status

- Phase 1 (implemented):
  - Identity lifecycle (email/password + OAuth flags), JWT + rotating refresh sessions.
  - RBAC/session guard boundaries for admin.
  - Guest/authenticated cart sync, merge summary, coalesced writes, stock reconciliation.
- Phase 2 (implemented baseline):
  - Checkout session creation, provider adapters (card-first + optional methods), coupon totals in checkout pipeline.
  - Orders persistence and status timeline wiring.
  - Webhook idempotency foundation with provider-event deduplication and deterministic order transitions.
- Phase 3 (deferred to forks):
  - Risk/review workflow (3DS, velocity checks, high-risk review queue), payments operations hardening, and telemetry expansion.
  - These are provider-specific and business-specific. Add in the fork, not the base.

## Scope

- Customer authentication:
  - Email + password login/registration.
  - Account email confirmation for email/password accounts.
  - Password reset flow for email/password accounts.
  - Social login options (Google, Facebook).
- Guest and authenticated cart support:
  - Guest cart persistence.
  - Authenticated server cart persistence.
  - Deterministic guest-to-account cart merge on login.
- Checkout session creation.
- Card-first payment integration with antifraud controls.
- Optional secondary methods support under "other payment forms" (Mercado Pago-style cash/bank options, PayPal).
- Coupon application in checkout totals.
- Webhook processing and idempotency.
- Order status timeline in admin.

## Architecture lock (mandatory before coding)

## Dependency baseline

- Deliverable `01b-database-readiness.md` defines the Cloudflare D1 baseline required for Deliverable 05 rollout on Cloudflare.
- Deliverable 05 assumes production and preview D1 bindings are valid and migrations are in sync.

### Data persistence contract

- Persistence stack:
  - Cloudflare D1 as primary relational store.
  - Drizzle ORM + SQL migrations as schema source-of-truth.
- Ownership:
  - D1 provisioning and binding correctness are owned by Deliverable 01b.
  - Auth/session tables and cart tables are implemented in Deliverable 05.
  - Existing catalog/content seed runtime store remains as compatibility layer until full persistence migration.
- Required tables in this deliverable:
  - users (with role and verification state)
  - accounts/providers
  - auth refresh sessions
  - verification tokens
  - password reset tokens
  - carts
  - cart items
  - orders
  - order items
  - order status timeline
  - payment attempts
  - payment webhook events (idempotency ledger)

### Identity/session contract

- Auth stack:
  - Auth.js (`next-auth`) + Drizzle adapter.
  - Credentials provider for email/password.
  - OAuth providers: Google and Facebook (enabled only when env secrets are present).
- Session strategy:
  - JWT access tokens + rotating refresh sessions in DB.
- Admin/session role source:
  - Single user identity model with role on user profile.
  - Server-side permission checks are mandatory for all admin mutations.

### Cart merge contract

- Guest cart source:
  - Browser local storage.
- Authenticated cart source:
  - Server cart in D1.
- Merge rule:
  - Key by `variantId`.
  - Quantity merge: `min(guestQty + accountQty, stockOnHand)`.
  - Unavailable lines are kept with warning state (not silently dropped).
- Idempotency:
  - Merge endpoint/action must be safe under retries.

### Operational env contract

- Required env vars:
  - `AUTH_SECRET`
  - `AUTH_REFRESH_TOKEN_SECRET`
  - `APP_BASE_URL`
  - `ADMIN_BASE_URL`
  - `AUTH_ACCESS_TTL_SECONDS`
  - `AUTH_REFRESH_IDLE_DAYS`
  - `AUTH_REFRESH_ABSOLUTE_DAYS`
  - `AUTH_ADMIN_REFRESH_IDLE_HOURS`
  - `AUTH_ADMIN_REFRESH_ABSOLUTE_DAYS`
  - `ADMIN_REQUIRE_CF_ACCESS`
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `FACEBOOK_CLIENT_ID`
  - `FACEBOOK_CLIENT_SECRET`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `MERCADOPAGO_ACCESS_TOKEN`
  - `MERCADOPAGO_WEBHOOK_SECRET`
  - `PAYPAL_CLIENT_ID`
  - `PAYPAL_CLIENT_SECRET`
  - `PAYPAL_WEBHOOK_ID`
  - `MOCK_PAYMENT_WEBHOOK_SECRET`
- Required Cloudflare binding:
  - D1 binding `DB`

## Implementation checklist

- Define auth abstraction/provider integration with:
  - Email/password registration/login.
  - Email verification token flow.
  - Password reset request + reset confirmation flow.
  - Google OAuth login.
  - Facebook OAuth login.
- Wire authenticated identity to admin role source and protected user/account routes.
- Define cart persistence strategy:
  - Guest cart in browser storage (MVP baseline from Deliverable 03).
  - Authenticated cart in server persistence.
  - Merge trigger when guest user authenticates.
- Implement deterministic cart merge policy:
  - Merge key: `variantId`.
  - Quantity merge: `min(guestQty + accountQty, stockOnHand)`.
  - If variant is no longer purchasable, keep line as warning state and exclude from checkout until resolved.
  - Deduplicate lines and preserve latest price snapshot source-of-truth from server catalog.
  - Emit merge summary for UX (merged, adjusted, unavailable lines).
- Add unit-tested pure merge engine and unified `POST /api/cart` endpoint (handles both replace and merge via `merge` flag).
- Add Zustand store for client cart UX state with localStorage persistence and best-effort server sync for authenticated users.
- Reconcile stock on cart writes (`POST /api/cart`):
  - Clamp over-limit quantities.
  - Preserve unavailable lines with warnings.
  - Return canonical cart + sync summary payload.
- Add lightweight variant availability endpoint for product pages and disable add-to-cart when availability is exhausted.
- Define payment provider abstraction layer.
- Keep card flow as default/primary checkout option and render optional methods as secondary options.
- Validate inventory at checkout-session creation:
  - Re-read canonical cart and compare requested quantities against `inventoryStock.availableQty`.
  - Return deterministic `insufficient_stock` payload (`409`) when validation fails.
- Keep oversell policy explicit for now:
  - Successful payment decrements `inventoryStock.onHandQty` and `inventoryStock.availableQty`.
  - Inventory values clamp at zero rather than going negative.
  - No timed reservation/hold window is used in this phase.
- Add risk controls (deferred to forks):
  - 3DS when available.
  - Velocity checks.
  - High-risk review queue.
- Add provider adapters for optional methods:
  - Mercado Pago optional methods.
  - PayPal optional method.
- Implement coupon engine in totals pipeline:
  - Percentage discount applies only to products subtotal (never to shipping).
  - Fixed amount discount applies to products subtotal and cannot reduce subtotal below zero.
  - Persist applied coupon data on order for traceability.
- Create webhook endpoint with signature verification.
- Persist payment events and map to order status transitions.
- Add admin view for payment evidence and status actions.
- Create flow docs in `docs/flows/05-payments-orders/` for auth lifecycle, cart merge, checkout, webhook lifecycle, and risk review.

## Cost note (session strategy)

- Estimated traffic: 500 to 900 monthly users with 8 to 15 clicks average.
- At this range, JWT-access and DB-refresh-session variable infrastructure costs are both effectively near-zero on selected Cloudflare included tiers.
- Rotating refresh sessions are selected for stronger revocation, device management, and long-lived ecommerce sign-in.

## Unit test requirements (pure logic only)

- Cart merge engine tests:
  - additive merge.
  - stock clamp merge.
  - unavailable variant handling.
  - duplicate-line normalization.
- Domain invariants and validation schemas.
- Coupon validation (pure rules, not service-level).

Note: mocked route/service tests have been removed in favor of E2E coverage. See TESTING.md for the rationale.

## E2E requirements (Playwright)

- E2E register form and forgot-password flow.
- E2E login with valid/invalid credentials.
- E2E guest cart -> login -> merged authenticated cart flow.
- E2E checkout happy path (mock payment success -> order confirmation).
- E2E failed payment path (mock payment failure -> cancel page).
- E2E unauthenticated checkout shows sign-in prompt.
- E2E order appears on account page after checkout.

## Acceptance criteria

- Customer can authenticate via email/password and social login.
- Email/password accounts require confirmation before checkout-critical actions.
- Password reset works end-to-end for email/password accounts.
- Guest cart is preserved and professionally merged into authenticated cart at login with deterministic conflict handling.
- Orders and payments remain consistent under retries.
- Checkout blocks only immediate stock conflicts; oversell after checkout start is currently accepted until a later inventory-reservation pass is introduced.
- Webhooks are safe against duplicate delivery.
- Coupon discounts are applied correctly and never discount shipping.
- Admin can inspect and act on payment/order state.
- Payment flow docs exist for happy path, failure path, and dispute/risk handling.

## Exit artifacts

- Auth module (email/password, verification, reset, OAuth adapters).
- Cart synchronization + merge module (guest <-> authenticated).
- Zustand client store for cart/auth UX state boundaries.
- Checkout + payment integration module.
- Coupon totals integration module.
- Webhook processor with tests.
- Order lifecycle dashboard views.
- `docs/flows/05-payments-orders/` flow documents.
- `docs/flows/05-payments-orders/auth-lifecycle-and-rbac-flow.md`.
- `docs/flows/05-payments-orders/guest-cart-merge-flow.md`.
- `docs/flows/05-payments-orders/checkout-and-provider-lifecycle-flow.md`.
- `docs/flows/05-payments-orders/webhook-idempotency-order-transition-flow.md`.
