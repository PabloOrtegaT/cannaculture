# Base Ecommerce

Reusable ecommerce foundation built with Next.js, TypeScript, and workspace packages.

## Prerequisites

- Node.js 20+
- npm 10+

## Setup

```bash
npm install
cp apps/web/.dev.vars.example apps/web/.dev.vars
npm run db:migrate:local
npm run db:seed
```

Optional local host split for admin surface:

- `APP_BASE_URL=http://storefront.lvh.me:3000`
- `ADMIN_BASE_URL=http://admin.lvh.me:3000`
- run dev and open `http://storefront.lvh.me:3000` for storefront, `http://admin.lvh.me:3000/admin` for admin.

Runtime env precedence:

- Explicit process env values win over Cloudflare context vars.
- This keeps local/dev/E2E redirects on local hosts even when `wrangler.jsonc` has production domain vars.

## Run locally

```bash
npm run dev
```

App URL: `http://localhost:3000`

Default local seeded owner account:

- Email: `owner@base-ecommerce.local`
- Password: `ChangeMe123!`

Important: these credentials are for local development only (`db:seed` runs against local D1).
Production does not auto-seed this user. Create your first owner account in production via register/verification flow or a controlled remote seed step.

Seed commands by environment:

- local D1: `npm run db:seed`
- production D1 (remote): `npm run db:seed:remote`
- preview D1 (remote preview): `npm run db:seed:remote:preview`

## Quality checks

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
```

E2E defaults:

- Storefront host: `http://storefront.lvh.me:3000`
- Admin host: `http://admin.lvh.me:3000`
- E2E always runs local migration + seed before starting dev server.
- Set `PLAYWRIGHT_REUSE_EXISTING_SERVER=1` only if you intentionally want to reuse a running server.
- Set `PLAYWRIGHT_PORT` to change E2E server port if needed.

## D05 Auth + Cart foundation

- Auth stack: Auth.js (`next-auth`) + Drizzle adapter + JWT sessions + rotating refresh sessions.
- Persistence: Cloudflare D1 (`DB` binding) + Drizzle migrations.
- Guest cart merges into authenticated server cart after login via `/auth/sync-cart`.
- Dedicated admin host routing is enforced by proxy when `ADMIN_BASE_URL` differs from `APP_BASE_URL`.
- When storefront/admin use subdomains of the same parent domain, auth and refresh cookies use a shared parent-domain scope for cross-subdomain continuity.

## Documentation

- Roadmap: `docs/roadmap/`
- Standards: `docs/standards/`
- Flow docs: `docs/flows/`

## Deploy to Cloudflare Workers

The web app includes OpenNext + Wrangler setup under `apps/web`.

### D1 setup (required before first deploy)

1. Create production D1:
   `npx wrangler d1 create base-ecommerce-prod`
2. Create preview/shared staging D1:
   `npx wrangler d1 create base-ecommerce-preview`
3. Copy the returned database IDs and update `apps/web/wrangler.jsonc`:
   `database_id` = prod DB ID
   `preview_database_id` = preview DB ID
4. Run preflight:
   `npm run cf:preflight`
5. Apply migrations:
   `npm run db:migrate:remote`
   `npm run db:migrate:remote:preview`

### Local Cloudflare preview

```bash
cp apps/web/.dev.vars.example apps/web/.dev.vars
npm run cf:preview
```

### Production deploy (manual)

```bash
npm run cf:deploy
```

If you are deploying only to `workers.dev` (no custom domain yet), set:

- `APP_BASE_URL=https://<your-worker>.<your-subdomain>.workers.dev`
- `ADMIN_BASE_URL=https://<your-worker>.<your-subdomain>.workers.dev`

Current default deploy domains are defined in `apps/web/wrangler.jsonc` (`vars.APP_BASE_URL` and `vars.ADMIN_BASE_URL`).

Required environment variables for deploy:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

If you deploy from Cloudflare dashboard build pipelines, ensure optional native deps are installed:

- install command: `npm ci --include=optional`
- if old caches were created before this config, run one deploy with cleared build cache.
- preflight gate is required and fails if D1 IDs in `wrangler.jsonc` are placeholders.

### GitHub Actions deploy

Workflow: `.github/workflows/deploy-cloudflare.yml`

Set repository secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
