# AGENTS.md — cannaculture

Compact guide for OpenCode sessions. Trust `package.json`, config, and CI over prose.

## Project direction

- This repo is a fork-in-progress from the generic base storefront toward the indoor-plant vertical. `plant-seeds` is the only profile that should survive here.
- Delete every `prints-3d`, `pc-components`, and other non-plant legacy path as work reaches it. Do not preserve cross-vertical compatibility in this repo.
- Do not mix verticals in runtime, tests, fixtures, docs, or production data. `STORE_PROFILE` is a hard boundary, not a theming toggle.

## Golden rules

- **Always check for available skills first.** Before starting any non-trivial task, use the `find-skills` tool to discover whether an installable skill exists that matches the work. Prioritize loading and using relevant skills over raw improvisation.
- **When in doubt, load multiple skills.** Several skills can apply to the same task (e.g., Cloudflare + Workers best practices + Next.js fundamentals). Load all that are relevant.
- **Skills are mandatory, not optional.** If a skill exists for the domain you are touching, you must load it before writing or reviewing code.
- Prefer shadcn-style primitives and composition. Reuse existing UI primitives before creating new wrappers, and migrate custom components to shadcn-compatible ones when the change is already in scope.
- Extend shared primitives instead of forking behavior. If a shadcn-style component is close, adjust variants/composition instead of introducing a second bespoke component.
- Delete dead code aggressively. When removing legacy behavior, also remove unused functions, variables, tests, fixtures, copy, and env references instead of leaving them behind.
- Client-side validation is UX only. Any rule enforced in forms or UI must also be enforced in server schemas, route handlers, or services.
- Treat auth, admin, cart, checkout, and payment/webhook code as security-sensitive. Preserve or strengthen existing server-side guards; do not relax them for convenience.
- Avoid parallel design-system copies. `apps/web/src/components/ui` and `packages/ui` already overlap; when touching duplicated primitives, converge on one source of truth instead of letting them drift.
- Every meaningful UI or domain change should update the matching test boundary: pure logic in Vitest, user-critical flows in Playwright.

## Workspace shape

- `apps/web` is the only runnable app. Root `dev`, `build`, `start`, `db:*`, and `cf:*` scripts all proxy there.
- `packages/domain`, `packages/ui`, `packages/validation` are internal ESM packages exported from `src/index.ts` and consumed via `file:` deps from `apps/web/package.json`.
- Storefront, auth, and admin live in the same Next app under route groups (`src/app/(storefront)`, `(auth)`, `(admin)`); host-based routing is enforced in `apps/web/src/middleware.ts`.
- `packages/ui` is still very small (`Button`, `cn`, `themeTokens`). Do not assume it is the full component source of truth yet.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run test
npm run test:e2e
```

- Focused web-only unit run: `npm run test --workspace @cannaculture/web`
- Root `npm run build` builds `apps/web` only.
- CI and deploy quality order is `lint -> typecheck -> test -> build`.

## Local setup

1. Copy env: `cp apps/web/.dev.vars.example apps/web/.dev.vars`
2. Apply local D1 migrations: `npm run db:migrate:local`
3. Seed local D1: `npm run db:seed`

- Default local app URL: `http://localhost:3000`
- Default seeded owner: `owner@cannaculture.local` / password from `DEV_OWNER_PASSWORD` env var
- For split storefront/admin hosts, set `APP_BASE_URL=http://storefront.lvh.me:3000` and `ADMIN_BASE_URL=http://admin.lvh.me:3000` in `.dev.vars`.
- Runtime env precedence matters: explicit process env overrides Cloudflare `wrangler.jsonc` vars. Keep this in mind for local redirects and Playwright runs.

## Testing

- Unit tests are Vitest + jsdom and are intended for pure logic only. Do not add mocked DB/service/route-handler tests.
- `npm run test` enforces 90% coverage thresholds only for the whitelist in `apps/web/vitest.config.ts` (`src/app/api/**/route.ts`, admin actions/guards, and `src/server/config/host-policy.ts`).
- E2E uses `apps/web/playwright.config.ts`; `playwright-test.config.ts` exists but is not the default config.
- Playwright defaults to `http://storefront.lvh.me:3000` and `http://admin.lvh.me:3000`, reuses an existing local server unless `PLAYWRIGHT_REUSE_EXISTING_SERVER=0`, skips DB bootstrap unless `PLAYWRIGHT_RUN_DB_BOOTSTRAP=1`, and uses `.next-playwright` to avoid colliding with another running Next server.

## Data and infra

- Drizzle schema source is `apps/web/src/server/db/schema.ts`; D1 client wiring is `apps/web/src/server/db/client.ts`; migrations live in `apps/web/drizzle/migrations`.
- `apps/web/scripts/run-next.mjs` wraps `next` for `dev`/`build`/`start` and forces `NEXT_IGNORE_INCORRECT_LOCKFILE=1`.
- `apps/web/scripts/playwright-db-bootstrap.mjs` exists because Playwright startup bootstrap is shell-sensitive on Windows.

## Cloudflare

- Deploy target is Cloudflare Workers via `opennextjs-cloudflare`; Wrangler config is `apps/web/wrangler.jsonc`.
- `npm run cf:deploy` runs preflight, build, and deploy. Preflight fails if D1 IDs in `wrangler.jsonc` are placeholders.
- Linux/CI installs need optional native deps; repo `.npmrc` sets `include=optional`, and deploy workflow uses `npm ci --include=optional`.
- If deploy fails with `code: 10027`, the Workers bundle exceeded the free-tier 3 MiB size limit.
- Keep `apps/web/src/middleware.ts` for now even though Next warns about `proxy`; current OpenNext + Cloudflare flow still depends on the middleware path.

## TypeScript and formatting

- `tsconfig.base.json` enables `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noFallthroughCasesInSwitch`, `noUnusedLocals`, and `noUnusedParameters`.
- Prettier is repo-wide with `singleQuote: false`, `trailingComma: "all"`, and `printWidth: 100`.
