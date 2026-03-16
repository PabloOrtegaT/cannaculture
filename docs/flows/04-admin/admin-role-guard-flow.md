# Admin Role Guard Flow

## Problem solved

Admin routes must enforce role boundaries so non-authorized roles cannot access sensitive modules (for example coupons/orders operations), and storefront users should only see admin entry points when they are truly admin users.

## User roles and actors

- Owner: full admin access.
- Manager: catalog/content/orders operational access.
- Catalog: storefront-only access, no admin panel access.
- Admin server layer: resolves active role and applies route/permission checks.

## How to use

1. Register and verify an account, then sign in.
2. Ensure the authenticated user has one of the allowed admin roles (`owner`, `manager`).
3. Open `/admin` routes.
4. Navigation displays only routes allowed for the session role.
5. If an authenticated non-admin user opens `/admin`, the app returns HTTP 403 (`forbidden` screen).

## How it works

- Role is resolved from authenticated session user.
- Admin-role boundary is explicit: only `owner` and `manager` are admin users.
- Host boundary is enforced (`admin.<domain>` only) before role checks.
- `canAccessAdminRoute(role, route)` maps each route to required permission.
- Storefront entry points (`Admin` nav link and home admin CTA) are rendered only for admin users.
- Page-level guards call `getRouteAccess(route)` before rendering modules.
- Server actions call `ensurePermission(permission)` before executing mutations.
- Write actions require recent authentication window validation.

## Why this approach

- Keeps authorization logic centralized and testable.
- Matches existing RBAC model from domain deliverable.
- Avoids silent failures by explicit 403 deny behavior for non-admin users.

## Alternatives considered

- Hardcoded role checks directly inside each page/action:
  - Faster initially, but brittle and duplicated.
- Env-only role simulation:
  - Good for very early scaffolding, but not acceptable for real auth security.

## Data contracts or schemas involved

- `roleSchema` and RBAC permission matrix from `@base-ecommerce/domain`.
- Session user contract from auth layer (`id`, `email`, `role`, `emailVerified`).
- Route permission map in `server/admin/role-guard.ts`.

## Failure modes and edge cases

- Missing session user on protected admin routes (redirect to login).
- Authenticated non-admin on protected admin routes (403 forbidden).
- Role with partial permissions attempts restricted action.
- Route allowed but action denied (guarded separately).

## Observability and debugging

- Guard helpers return `{ role, allowed }` for deterministic checks.
- Action guard errors include missing permission detail.
- Forbidden route access is surfaced by the app-level forbidden screen.

## Security considerations

- Mutations are permission-gated server-side.
- Admin host + optional Cloudflare Access header gate are enforced server-side.
- UI entry filtering is convenience only; server-side checks remain the security boundary.

## Tests that validate this flow

- `src/__tests__/admin/role-guard.test.ts`
- Existing RBAC tests in `src/__tests__/domain/rbac.test.ts`

## Open questions or future improvements

- Add audit logs for denied attempts and sensitive admin actions.
- Add MFA for privileged admin roles.
