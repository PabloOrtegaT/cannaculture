# Deliverable 04: Admin Dashboard

## Objective

Provide an operational dashboard for managing products, content, and catalog updates.

## Scope

- Authentication and role-gated admin routes.
- Product and variant CRUD.
- Category and attribute management.
- Home content management.
- Coupon management (percentage and fixed amount).
- Admin shell theme parity (day/night) using shared theme system.
- Bulk CSV import.
- Analytics widgets foundation.

## Implementation checklist

- Implement role-protected admin layout and navigation.
- Reuse storefront theme provider/tokens in admin routes and expose theme toggle in admin shell.
- Use TanStack Table for all tabular modules:
  - Products
  - Variants
  - Orders
  - Coupons
  - Content entries where table fits
- Implement coupon CRUD with activation controls:
  - Percentage coupon (applies to products subtotal only, shipping excluded).
  - Fixed amount coupon.
  - Validity windows, usage limits, and active/inactive state.
- Implement CSV import with row-level error reporting.
- Add Recharts for core dashboard charts:
  - Sales trend
  - Top products
  - Order status distribution
- Create admin flow docs in `docs/flows/04-admin/` for CRUD, import, roles, and analytics panels.

## Unit test requirements

- Table column definition tests (formatters and sorting logic).
- CSV parser/mapper tests (valid, partial invalid, invalid header).
- Role-based route guards tests.
- Coupon validation tests (type rules, date windows, limits, active state).

## Integration/e2e requirements

- E2E for admin product create/edit flow.
- E2E for CSV import success and partial-failure path.

## Acceptance criteria

- Admin can fully manage catalog and home content.
- Admin can create and manage reusable coupons for checkout.
- Admin routes support day/night themes with shared tokens and no visual regressions.
- Role restrictions are enforced.
- Table and chart modules render correctly with real data shapes.
- Admin flow docs exist for core operations and permission boundaries.

## Exit artifacts

- Admin route set.
- CRUD and bulk import workflows.
- Coupon admin module.
- Dashboard table/chart components using selected libraries.
- `docs/flows/04-admin/admin-role-guard-flow.md`.
- `docs/flows/04-admin/admin-crud-flow.md`.
- `docs/flows/04-admin/admin-coupon-management-flow.md`.
- `docs/flows/04-admin/admin-import-and-analytics-flow.md`.
