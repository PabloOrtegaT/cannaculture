# Deliverable 05: Payments and Orders

## Objective

Implement reliable checkout, order lifecycle, and payment event handling.

## Scope

- Checkout session creation.
- Card-first payment integration with antifraud controls.
- Optional secondary methods support under "other payment forms" (Mercado Pago-style cash/bank options, PayPal).
- Coupon application in checkout totals.
- Webhook processing and idempotency.
- Order status timeline in admin.

## Implementation checklist

- Define payment provider abstraction layer.
- Keep card flow as default/primary checkout option and render optional methods as secondary options.
- Add risk controls:
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
- Create payment flow docs in `docs/flows/05-payments-orders/` for checkout, webhook lifecycle, and risk review.

## Unit test requirements

- Payment state machine transitions.
- Idempotent webhook event handling.
- Risk rule evaluation logic.
- Coupon totals calculation tests (percentage/fixed, shipping exclusion, floor at zero).

## Integration/e2e requirements

- E2E checkout happy path.
- E2E failed payment path.
- E2E webhook replay without duplicate side effects.
- E2E checkout with coupon applied and verified totals.

## Acceptance criteria

- Orders and payments remain consistent under retries.
- Webhooks are safe against duplicate delivery.
- Coupon discounts are applied correctly and never discount shipping.
- Admin can inspect and act on payment/order state.
- Payment flow docs exist for happy path, failure path, and dispute/risk handling.

## Exit artifacts

- Checkout + payment integration module.
- Coupon totals integration module.
- Webhook processor with tests.
- Order lifecycle dashboard views.
- `docs/flows/05-payments-orders/` flow documents.
