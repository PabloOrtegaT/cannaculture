# Release Checklist

Use this before every production deploy and when cutting a fork release.

## Code quality

- [ ] `npm run lint` — no lint errors
- [ ] `npm run typecheck` — no TypeScript errors
- [ ] `npm run test` — all unit tests pass, 90% coverage gate passes for gated modules
- [ ] `npm run test:e2e` — all Playwright E2E tests pass against a running local instance

## Database

- [ ] All Drizzle migrations applied (`npm run db:migrate:remote` for production D1)
- [ ] `wrangler.jsonc` D1 database IDs are real (not placeholder UUIDs)
- [ ] `npm run cf:preflight` passes (validates D1 IDs and required env var presence)

## Environment variables

- [ ] `AUTH_SECRET` is set and is a strong random value (not the example string)
- [ ] `AUTH_REFRESH_TOKEN_SECRET` is set and different from `AUTH_SECRET`
- [ ] `APP_BASE_URL` and `ADMIN_BASE_URL` point to the correct production domains
- [ ] `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are configured for transactional email
- [ ] At least one live payment provider is configured (Stripe recommended as primary)
- [ ] Webhook secrets are set for all active payment providers
- [ ] `ADMIN_REQUIRE_CF_ACCESS=true` is set if admin surface is behind Cloudflare Access

## Security

- [ ] Admin host is isolated from storefront (different subdomain or domain)
- [ ] Cloudflare Access is configured on the admin subdomain (if `ADMIN_REQUIRE_CF_ACCESS=true`)
- [ ] `STORE_PROFILE` is set to exactly one vertical — no mixed profile data in production D1
- [ ] No development seed data (sample users, sample products from other verticals) in production D1
- [ ] CORS and host policy settings are correct for your domain configuration

## Payment providers

- [ ] Stripe webhook endpoint registered in Stripe dashboard: `POST /api/payments/webhook/stripe`
- [ ] Mercado Pago webhook endpoint registered (if MP is active): `POST /api/payments/webhook/mercadopago`
- [ ] PayPal webhook endpoint registered (if PayPal is active): `POST /api/payments/webhook/paypal`
- [ ] Webhook signatures verified in staging before production flip

## Post-deploy verification

- [ ] Storefront home page loads correctly with the right vertical's catalog
- [ ] Admin dashboard loads and role guard works (non-admin users are redirected)
- [ ] Customer registration + email verification flow completes end-to-end
- [ ] A test checkout in mock mode (or Stripe test mode) creates an order successfully
- [ ] Order appears in the admin order list after successful checkout
- [ ] No boot-time errors in Cloudflare Worker logs (`wrangler tail`)

## Rollback plan

If a deploy introduces a critical regression:

1. Revert to the previous worker deployment via Cloudflare dashboard (Workers → Deployments → Rollback).
2. If the regression is schema-related: Drizzle migrations are append-only — do not destructively revert without a tested down-migration.
3. Communicate the rollback status to active users if checkout or auth flows are affected.
