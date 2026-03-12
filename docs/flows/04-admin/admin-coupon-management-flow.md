# Admin Coupon Management Flow

## Problem solved

All forks require reusable coupon management with consistent discount rules: percentage or fixed amount, applied only to products subtotal.

## User roles and actors

- Owner/Manager (orders write permission): can manage coupons.
- Catalog role: cannot manage coupons.
- Admin service layer: validates and stores coupon state.

## How to use

1. Open `/admin/coupons`.
2. Create coupon:
   - Type `percentage` with `percentageOff`, or
   - Type `fixed` with `amountOffCents` + currency.
3. Define start/end window, usage limit, and active state.
4. Toggle existing coupon active/inactive using status form.
5. Verify coupon rows in TanStack coupons table.

## How it works

- Coupon schema lives in `@base-ecommerce/domain` (`couponSchema`).
- DTO input schemas in `@base-ecommerce/validation` enforce create/update payload shape.
- Service creates coupons with usage tracking defaults (`usageCount = 0`) and timestamps.
- Helper functions evaluate applicability (`isActive`, date window, usage limits) and discount computation.

## Why this approach

- Prevents coupon rule drift across routes/modules.
- Keeps discount logic reusable for checkout deliverable.
- Supports role-based admin restrictions from day one.

## Alternatives considered

- Encode coupon rules directly in checkout totals pipeline only:
  - Simpler short term, but removes reusable admin validation boundary.
- Single coupon type:
  - Insufficient for planned forks and campaign flexibility.

## Data contracts or schemas involved

- `couponSchema`, `couponTypeSchema`, `couponTargetSchema`
- `createCouponInputSchema`, `updateCouponInputSchema`
- helper functions:
  - `isCouponApplicable`
  - `calculateCouponDiscountCents`

## Failure modes and edge cases

- Percentage coupon with fixed fields (invalid).
- Fixed coupon missing amount/currency (invalid).
- End date before start date (invalid).
- Coupon exhausted by usage limit.
- Inactive coupon or outside validity window.

## Observability and debugging

- Zod issue paths identify exact invalid field combinations.
- Coupons table displays usage counters and active state.

## Security considerations

- Coupon write actions require `orders:write` permission.
- Invalid payloads are rejected before state mutation.

## Tests that validate this flow

- `src/__tests__/admin/coupon-validation.test.ts`
- `src/__tests__/admin/role-guard.test.ts` (route-level restrictions)

## Open questions or future improvements

- Add coupon code uniqueness across persistence layer constraints.
- Add per-coupon minimum subtotal and category constraints.
- Persist redemption history for auditability.
