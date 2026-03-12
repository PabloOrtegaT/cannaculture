# Admin Role Guard Flow

## Problem solved

Admin routes must enforce role boundaries so non-authorized roles cannot access sensitive modules (for example coupons/orders operations).

## User roles and actors

- Owner: full admin access.
- Manager: catalog/content/orders operational access.
- Catalog: catalog and inventory operations, no coupon/orders writes.
- Admin server layer: resolves active role and applies route/permission checks.

## How to use

1. Set `ADMIN_ROLE` (`owner`, `manager`, `catalog`) in environment.
2. Open `/admin` routes.
3. Navigation displays only routes allowed for the active role.
4. If role cannot access a route/module, an access-denied panel is rendered.

## How it works

- Role is resolved in `getAdminRole()` from env with schema validation.
- `canAccessAdminRoute(role, route)` maps each route to required permission.
- Page-level guards call `getRouteAccess(route)` before rendering modules.
- Server actions call `ensurePermission(permission)` before executing mutations.

## Why this approach

- Keeps authorization logic centralized and testable.
- Matches existing RBAC model from domain deliverable.
- Avoids silent failures by explicit deny-state rendering.

## Alternatives considered

- Hardcoded role checks directly inside each page/action:
  - Faster initially, but brittle and duplicated.
- Full auth provider integration in this deliverable:
  - Valuable later, but out of scope for base dashboard foundation.

## Data contracts or schemas involved

- `roleSchema` and RBAC permission matrix from `@base-ecommerce/domain`.
- `ADMIN_ROLE` environment contract in `server/admin/session.ts`.
- Route permission map in `server/admin/role-guard.ts`.

## Failure modes and edge cases

- Invalid `ADMIN_ROLE` value must fail fast.
- Role with partial permissions attempts restricted action.
- Route allowed but action denied (guarded separately).

## Observability and debugging

- Guard helpers return `{ role, allowed }` for deterministic checks.
- Action guard errors include missing permission detail.

## Security considerations

- Mutations are permission-gated server-side.
- UI route filtering is not treated as security boundary by itself.

## Tests that validate this flow

- `src/__tests__/admin/role-guard.test.ts`
- Existing RBAC tests in `src/__tests__/domain/rbac.test.ts`

## Open questions or future improvements

- Replace env-role with authenticated session role source.
- Add audit logs for denied attempts and sensitive admin actions.
