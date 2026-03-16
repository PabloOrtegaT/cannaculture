# Auth Lifecycle and Session RBAC Flow

## Problem solved

The platform needs real authentication with role-based authorization so admin operations are protected by server-side session checks instead of environment-role simulation.

## User roles and actors

- Visitor: can register, verify account, request reset, and log in.
- Authenticated customer: can access account/cart synchronization flows.
- Authenticated admin user: can access admin routes/actions according to role permissions.
- Auth server layer: validates credentials, session state, and role permissions.

## How to use

1. Open `/register` and create an email/password account.
2. Verify account using link sent by email.
3. Open `/login` and sign in with credentials or available OAuth providers.
4. Open `/admin`; access depends on role in session user profile.
5. Use `/forgot-password` and `/reset-password` for password recovery.
6. For local host-split testing, use:
   - storefront: `http://storefront.lvh.me:3000` (manual dev)
   - admin: `http://admin.lvh.me:3000` (manual dev)
   - Playwright E2E defaults to port `3000`.

## How it works

- Auth.js (`next-auth`) uses Drizzle adapter + D1-backed tables.
- Credentials provider validates password hash and verified-email state.
- Session strategy is JWT-backed with rotating refresh sessions in D1.
- Admin route pages and server actions enforce permission checks from session role.
- Runtime env resolution gives precedence to process env overrides to keep local/E2E host routing deterministic.
- Split-host setups use shared parent-domain cookie scope when possible (for example `storefront.*` and `admin.*`), enabling authenticated continuity across subdomains.

## Why this approach

- Aligns auth, refresh-session revocation, and role checks with backend-trusted security boundaries.
- Enables long-lived ecommerce login with device/session revocation controls.
- Keeps provider-based login optional by env configuration.

## Alternatives considered

- JWT + refresh sessions:
  - Keeps persistent login while preserving server-side revocation controls.
- Separate admin identity store:
  - Stronger isolation but higher complexity for this phase.

## Data contracts or schemas involved

- Auth tables:
  - `user`, `account`, `authRefreshSession`, `verificationToken`, `passwordResetToken`
- Session user contract:
  - `id`, `email`, `role`, `emailVerified`, `sid`, `authenticatedAt`
- Role/permission model from `@base-ecommerce/domain`.

## Failure modes and edge cases

- Invalid/expired verification token.
- Invalid/expired password reset token.
- OAuth provider env vars missing.
- Authenticated user without required admin permission.

## Observability and debugging

- Validation and permission errors surface explicit messages.
- Auth provider flags are environment-driven and visible in login UI state.
- E2E login helper asserts final host belongs to local allowed hosts to detect accidental production-domain redirects early.

## Security considerations

- Passwords are hashed server-side before persistence.
- Admin mutations require server-side permission checks.
- Email/password login blocks unverified accounts.

## Tests that validate this flow

- Unit tests for auth token lifecycle.
- Unit tests for RBAC permission mapping.
- Integration tests for admin action permission enforcement.

## Open questions or future improvements

- Add MFA for privileged admin roles.
- Add audit trail for denied/sensitive admin actions.
- Add login anomaly detection and rate limiting.
