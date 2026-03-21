# Forking Playbook

## What this is

Step-by-step guide for creating a domain-specific store from the base-ecommerce repository.
The base supports three built-in store profiles: `prints-3d`, `pc-components`, `plant-seeds`.
Each fork runs a single active profile — no mixed-vertical data in production.

## Prerequisites

- Node.js 20+, npm 10+
- Cloudflare account with Workers and D1 access
- A Resend account (or any SMTP provider — swap the adapter in `src/server/email/`)
- Payment provider credentials (at least one: Stripe, Mercado Pago, or PayPal)

## Step 1 — Clone and rename

```bash
git clone https://github.com/your-org/base-ecommerce.git my-store
cd my-store
git remote set-url origin https://github.com/your-org/my-store.git
```

Update package name in `apps/web/package.json` and the monorepo root `package.json` to match your store name.

## Step 2 — Choose a store profile

Set `STORE_PROFILE` to one of:

| Profile | Vertical | Sample seed data |
|---|---|---|
| `pc-components` | PC hardware components | CPU, GPU, RAM, storage, case variants |
| `plant-seeds` | Seed and plant nursery | Vegetable, herb, and flower seed packets |
| `prints-3d` | 3D printing supplies | Filament, resin, and printer accessories |

This value controls:
- Which seed fixtures load at `npm run db:seed`
- Which category attribute schemas are active
- Profile isolation enforcement (other vertical data is rejected at runtime)

If none of these fit your vertical, add a new profile:
1. Add the profile ID to `src/server/config/store-profiles.ts`
2. Add seed fixtures in `apps/web/scripts/seed/`
3. Define category attributes for your vertical in the admin panel after first deploy

## Step 3 — Provision Cloudflare D1 databases

```bash
npx wrangler d1 create my-store-prod
npx wrangler d1 create my-store-preview
```

Copy the returned database IDs and update `apps/web/wrangler.jsonc`:

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "my-store-prod",
      "database_id": "<prod-db-id>",
      "preview_database_id": "<preview-db-id>"
    }
  ]
}
```

## Step 4 — Configure environment variables

Copy the example vars file and fill in all required values:

```bash
cp apps/web/.dev.vars.example apps/web/.dev.vars
```

### Required vars

| Var | Description |
|---|---|
| `STORE_PROFILE` | Your chosen vertical: `pc-components`, `plant-seeds`, or `prints-3d` |
| `AUTH_SECRET` | Long random string — generate with `openssl rand -hex 32` |
| `AUTH_REFRESH_TOKEN_SECRET` | Second long random string — generate separately |
| `APP_BASE_URL` | Your storefront domain, e.g. `https://mystore.com` |
| `ADMIN_BASE_URL` | Your admin domain, e.g. `https://admin.mystore.com` |

### Email (required for password reset and verification)

| Var | Description |
|---|---|
| `RESEND_API_KEY` | Resend API key from [resend.com](https://resend.com) |
| `RESEND_FROM_EMAIL` | Sender address, e.g. `My Store <noreply@mystore.com>` |

### Session timeouts (can keep defaults)

```
AUTH_ACCESS_TTL_SECONDS=900
AUTH_REFRESH_IDLE_DAYS=30
AUTH_REFRESH_ABSOLUTE_DAYS=180
AUTH_ADMIN_REFRESH_IDLE_HOURS=8
AUTH_ADMIN_REFRESH_ABSOLUTE_DAYS=7
```

### Payment providers (at least one required for live checkout)

Card-first (primary):

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Optional secondary methods:

```
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
MERCADOPAGO_WEBHOOK_SECRET=...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_WEBHOOK_ID=...
```

Providers without credentials stay in mock mode (safe for development, not for production).

### Social login (optional)

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
FACEBOOK_CLIENT_ID=...
FACEBOOK_CLIENT_SECRET=...
```

OAuth providers are disabled when credentials are absent — no code changes needed.

### Security

```
ADMIN_REQUIRE_CF_ACCESS=true   # Recommended in production — gate admin host behind Cloudflare Access
```

## Step 5 — Run migrations and seed

Local:

```bash
npm run db:migrate:local
npm run db:seed
```

Production D1 (after configuring Cloudflare credentials):

```bash
npm run db:migrate:remote
```

Do not run `db:seed:remote` in production unless you want sample fixture data. Create your first owner account via the registration + verification flow instead, then promote the user to `owner` role directly in D1 if needed.

## Step 6 — Run quality gates locally

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
```

All must pass before deploying. E2E tests require a running local server — see `TESTING.md`.

## Step 7 — Run preflight check

```bash
npm run cf:preflight
```

This validates that:
- D1 database IDs in `wrangler.jsonc` are not placeholder values
- Required env vars are present in the worker environment

The deploy will fail if preflight fails.

## Step 8 — Deploy

```bash
npm run cf:deploy
```

Or trigger automatically via the GitHub Actions workflow (`.github/workflows/deploy-cloudflare.yml`) by pushing to your deploy branch.

## Step 9 — Verify production

After deploy:

1. Open the storefront URL — confirm the home page loads with your profile's catalog data.
2. Open the admin URL — confirm the admin login and dashboard load.
3. Register a customer account and complete the verification flow.
4. Add a product to cart and complete a checkout in test mode (use Stripe test keys or leave provider unconfigured for mock mode).
5. Confirm the order appears in the admin order view.
6. Review the Cloudflare Workers logs for any boot-time telemetry warnings.

## Post-fork customization

Layer vertical-specific features onto your fork after the base quality gates pass:

| What | Where to start |
|---|---|
| Product attributes | Admin panel → Category attributes, or add to seed fixtures |
| Custom storefront pages | `apps/web/src/app/(storefront)/` |
| Custom admin sections | `apps/web/src/app/(admin)/admin/` |
| Risk controls / antifraud | `apps/web/src/server/payments/` — add velocity checks, 3DS, review queue |
| Additional payment methods | Add a new adapter in `apps/web/src/server/payments/provider.ts` |
| Persistent audit log | Replace console telemetry with a DB-backed or external log sink |
| External observability | Wire Sentry/Datadog/etc to `src/server/observability/telemetry.ts` |
| Multi-locale / i18n | Add locale routing under `apps/web/src/app/` and hreflang metadata |

## Profile isolation check

Run this after any major seed or catalog import:

- Confirm no products from other verticals appear in the catalog.
- The `STORE_PROFILE` env var enforces this at runtime — any mismatch throws a boot-time error.
- Profile isolation unit tests in `src/__tests__/domain/profile-isolation.test.ts` validate the enforcement logic.
