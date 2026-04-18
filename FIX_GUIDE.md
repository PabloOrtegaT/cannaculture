# Production Readiness Fix Guide — `base-ecommerce` (plant-seeds vertical)

Companion runbook to `AUDIT.md` (same repo root). This guide turns the findings into a sequenced, step-by-step remediation plan. Each step is scoped to one concern so it can be reviewed, merged, and rolled back independently.

Ground rules:

- Work through the tiers top-to-bottom. Inside each tier, steps are already ordered safest-first — the earliest steps in every tier are small config flips or single-file edits, the later ones touch schema / deploy surface / payment flow.
- Every step has a **Verify** block. Do not mark a step done until the listed command or browser check passes.
- Every step has a **Rollback** block. If `Verify` fails, rollback *that step only* before moving on.
- `AUDIT.md` is the source of truth for "why". This guide is the source of truth for "how".

---

## How to use this guide

1. Finish **Step 0 — Pre-flight** before anything else. The audit ran in a sandbox that could not execute `typecheck`, `test`, `build`, `test:e2e`, or `npm audit` cleanly (see `AUDIT.md` → Appendix B). You must re-establish a known-green baseline locally first, otherwise "Verify" cannot distinguish your change from pre-existing drift.
2. Work one step at a time. Create a dedicated branch per step (`git checkout -b fix/<area>-<short-slug>`), land it via PR, merge, then move on.
3. Use the suggested commit message verbatim — the repo follows Conventional Commits (`feat(scope): …`, `fix(scope): …`, `chore(scope): …`) as seen in `git log` on `main`.
4. Re-run `npm run lint && npm run typecheck && npm run test && npm run build` at the end of every step that changes code. Re-run `npm run test:e2e` at the end of every step in Tier 1 (Immediate) and Tier 2 (Short-term).
5. When this guide specifies a file diff, the `-` lines are the *current* content taken directly from the cited file at audit time; the `+` lines are the recommended replacement. Re-read the file first — if it has drifted, adapt the diff; do not blindly apply.
6. Treat any step marked "touches wrangler.jsonc or migrations" as a coordinated deploy: land the PR, apply the migration on preview D1, smoke-test, then apply on production D1, then deploy the Worker.

Severity keys used below mirror `AUDIT.md` (CRITICAL / HIGH / MEDIUM / LOW).

---

## Step 0 — Pre-flight

### 0.1 Re-establish a clean toolchain baseline

- What this fixes: the "unknowns" called out in `AUDIT.md` → *Tooling gaps* and Appendix B (typecheck, test, build, test:e2e, npm audit).
- Why it matters: every later Verify step depends on the project building and testing cleanly on your machine. Any pre-existing failure will masquerade as a failure caused by your change.
- Prerequisites: Node version matching `package.json` `engines` (run `node -v`); Windows dev machine matches the original install, per `AGENTS.md` → *Data and infra*.
- Actions:

  ```bash
  # From repo root
  git status              # expect clean working tree
  git pull --ff-only
  rm -rf node_modules package-lock.json
  rm -rf apps/web/node_modules
  rm -rf packages/*/node_modules
  npm install             # repo .npmrc has include=optional
  npm run lint
  npm run typecheck
  npm run test
  npm run build
  npx playwright install  # first run only
  # Optional but recommended before starting Tier 1:
  npm audit --omit=dev
  npm audit --audit-level=high
  ```

- Verify: every command above exits 0. If `npm run test` reports coverage under 90% on the whitelist, capture the baseline — do not treat it as a new failure introduced by you.
- Rollback: `git reset --hard HEAD` if you accidentally staged anything. No code changed in this step.
- Suggested commit message: none — this step produces no commit.

### 0.2 Snapshot the current production D1 and take a Worker deployment reference

- What this fixes: gives you a rollback target before any Tier 1 change.
- Why it matters: Several Tier 1 steps change deploy workflow or wrangler config. If a deploy goes bad, you need an identifiable "last known good" to redeploy from.
- Prerequisites: access to the Cloudflare account that owns the Worker; `wrangler` logged in (`npx wrangler whoami`).
- Actions:

  ```bash
  # Capture the current production commit SHA deployed
  git rev-parse --short origin/main
  # Export the current D1 schema/data
  npx wrangler d1 export DB --remote --output ./backups/d1-prod-$(date +%Y%m%d-%H%M).sql
  # Capture current Worker version id via Cloudflare dashboard or:
  npx wrangler deployments list
  ```

- Verify: `ls -lh ./backups/` shows a non-empty `.sql` file; `wrangler deployments list` prints a recent deployment id.
- Rollback: n/a (read-only).
- Suggested commit message: none — the `backups/` path should be in `.gitignore` or kept out of the repo.

### 0.3 Create a working branch for Tier 1

```bash
git checkout main && git pull --ff-only
git checkout -b fix/tier-1-pre-flight
```

Use this branch only to land the Step 0.4 gitignore hygiene if you like; otherwise Tier 1 steps each get their own branch.

### 0.4 (Optional) Gitignore `*.tsbuildinfo`

- What this fixes: `AUDIT.md` F1-1.
- Why it matters: tiny hygiene, cheap to land, keeps future diffs clean.
- Prerequisites: clean working tree.
- Actions:

  ```bash
  # From repo root
  echo "*.tsbuildinfo" >> .gitignore
  git rm --cached apps/web/tsconfig.tsbuildinfo
  git add .gitignore
  ```

- Verify: `git status` shows `.gitignore` modified and `apps/web/tsconfig.tsbuildinfo` deleted (staged). `npm run typecheck` still passes and regenerates the file untracked.
- Rollback: `git restore --staged .gitignore apps/web/tsconfig.tsbuildinfo && git checkout -- .gitignore && git checkout HEAD -- apps/web/tsconfig.tsbuildinfo`.
- Suggested commit message: `chore(repo): gitignore tsbuildinfo artifacts`

---

## Step 1 — Immediate (CRITICAL, ship-blocking)

Sequenced smallest/safest → largest. Do not reorder. Each step produces a separate PR.

### 1.1 Gate `/api/payments/mock/complete` to development builds (F4-4)

- What this fixes: `AUDIT.md` F4-4 — authenticated users can mark their own `pending_payment` orders as paid without paying.
- Why it matters: in production the route takes an order id from the caller's session, asserts ownership, then drives `updateOrderPaymentState` to `succeeded`. It exists for local end-to-end tests but is reachable on prod.
- Prerequisites: Step 0 complete.
- Actions (edit `apps/web/src/app/api/payments/mock/complete/route.ts`, add env guard at the very top of `POST`):

  ```diff
  @@ imports unchanged
  -import { NextResponse } from "next/server";
  +import { NextResponse } from "next/server";
  +import { getRuntimeEnvironment } from "@/server/config/runtime-env";
  ```

  ```diff
   export async function POST(request: NextRequest) {
  +  // F4-4: This route exists only for local dev / E2E. Refuse in production.
  +  const env = getRuntimeEnvironment();
  +  if (env.NEXTJS_ENV !== "development" && env.NODE_ENV !== "development") {
  +    return new NextResponse("Not found", { status: 404 });
  +  }
  +
     const session = await getSessionUser();
  ```

  (If your `runtime-env.ts` exposes a helper like `isDevelopment()` prefer that. Keep the return body to plain 404 text — do not leak the existence of the route via a structured error.)

- Verify:

  ```bash
  # Unit / lint
  npm run lint && npm run typecheck && npm run test
  # Manual: start the worker against a non-dev env and hit the route.
  # Expect 404 regardless of auth state.
  curl -i -X POST http://localhost:8787/api/payments/mock/complete \
    -H "Content-Type: application/json" -d '{"orderId":"x"}'
  ```

- Rollback: `git revert <sha>` on the merge commit; the route immediately returns to accepting calls.
- Suggested commit message: `fix(payments): gate mock complete route to development builds`

### 1.2 Add a D1 migration step to the deploy workflow (F8-2)

- What this fixes: `AUDIT.md` F8-2 — production deploy never runs `wrangler d1 migrations apply` so the first schema-changing merge to `main` ships a Worker that references columns the DB does not have.
- Why it matters: outage on first schema change. Low-risk to add because your current migrations are already applied.
- Prerequisites: Step 0.2 (D1 snapshot) done. Confirm `.github/workflows/deploy-cloudflare.yml` authentication secrets already include a Cloudflare API token with `D1:Edit` scope.
- Actions (edit `.github/workflows/deploy-cloudflare.yml`, insert before `cf:deploy`):

  ```diff
       - name: Preflight
         run: npm run cf:preflight

  +    - name: Apply D1 migrations (remote)
  +      run: npx wrangler d1 migrations apply DB --remote
  +      env:
  +        CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
  +        CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
  +
       - name: Deploy Cloudflare Worker
         run: npm run cf:deploy
  ```

- Verify:

  ```bash
  # Sanity: the step is syntactically valid.
  npx -y action-validator .github/workflows/deploy-cloudflare.yml || true
  # Actually exercise it: push to a throwaway branch that targets main via PR,
  # or trigger via workflow_dispatch on a test ref.
  ```

  On the next merge to `main`, the workflow logs should show `No migrations to apply` (or the list of pending migrations) before the deploy step runs.

- Rollback: `git revert <sha>`. The workflow goes back to skipping migrations. Production D1 is unchanged.
- Suggested commit message: `fix(ci): apply D1 migrations before Cloudflare deploy`

### 1.3 Disable PayPal provider until signed + prod URL are wired (F4-1, F4-2)

- What this fixes: `AUDIT.md` F4-1 (webhook has no signature verification) and F4-2 (API calls hardcoded to sandbox). Full fix arrives in Step 2.4; this step prevents exploitation *now* by making sure the provider cannot be selected.
- Why it matters: flipping the feature flag off is immediate; writing correct PayPal signature verification is a multi-day task. Do the safe thing first.
- Prerequisites: confirm with the team whether PayPal is actually enabled on production today. If it is not, this step is a no-op kill-switch hardening. If it is, announce downtime for PayPal checkouts before merging.
- Actions:
  - In `apps/web/src/server/payments/provider.ts`, at the top of the PayPal provider's exported factory (search for the block that returns the `paypal` provider; first statement of the factory), insert:

    ```diff
    +  if (process.env.NEXTJS_ENV === "production" && process.env.PAYPAL_PROD_ENABLED !== "true") {
    +    return null;
    +  }
    ```

    (If the factory is called unconditionally and expected to return a provider, instead filter it out in `getAvailablePaymentProviders()` — grep for "paypal" there and exclude it unless `PAYPAL_PROD_ENABLED === "true"`.)
  - In `apps/web/wrangler.jsonc`, `vars`, confirm `PAYPAL_PROD_ENABLED` is **not** set (or set it to `"false"`).
  - In `apps/web/.dev.vars.example`, add `# PAYPAL_PROD_ENABLED=false` with a comment: *"Do not enable until F4-1 and F4-2 from FIX_GUIDE.md are closed."*
- Verify:

  ```bash
  npm run lint && npm run typecheck && npm run test
  # Handler test: force NEXTJS_ENV=production and call getAvailablePaymentProviders().
  # Expect paypal to be absent from the returned list.
  ```

- Rollback: `git revert <sha>`.
- Suggested commit message: `fix(payments): disable paypal provider until signature and prod url land`

### 1.4 Replace Mercado Pago plain-secret compare with HMAC verification (F4-3)

- What this fixes: `AUDIT.md` F4-3 — MP webhook does `signature !== config.mercadoPagoWebhookSecret`, which is not MP's documented signature scheme.
- Why it matters: a single leak of the `x-signature` header (log, screenshot, sidecar proxy) permanently enables forged MP events. HMAC verification is the documented scheme.
- Prerequisites:
  - MP webhook secret rotated in the MP dashboard (old one may be compromised).
  - Updated `MERCADO_PAGO_WEBHOOK_SECRET` in both local `.dev.vars` and the Cloudflare secret store (`wrangler secret put MERCADO_PAGO_WEBHOOK_SECRET`).
  - Read MP's current `x-signature` docs (format is `ts=<timestamp>,v1=<hmac-sha256-hex>` over `id:<dataId>;request-id:<requestId>;ts:<ts>;` — confirm against their docs at time of fix).
- Actions (edit `apps/web/src/server/payments/provider.ts` around line 294-296):

  ```diff
  -  if (signature !== config.mercadoPagoWebhookSecret) {
  -    throw new Error("Invalid MP signature");
  -  }
  +  // F4-3: real HMAC verification. MP signs the "manifest" with the webhook secret.
  +  const parsed = parseMpSignature(signature); // helper: splits "ts=...,v1=..."
  +  if (!parsed) throw new Error("Invalid MP signature format");
  +
  +  const manifest = `id:${dataId};request-id:${requestId};ts:${parsed.ts};`;
  +  const expected = await hmacSha256Hex(config.mercadoPagoWebhookSecret, manifest);
  +  if (!equalSignature(expected, parsed.v1)) {
  +    throw new Error("Invalid MP signature");
  +  }
  +  // Reject replays older than 5 minutes.
  +  const nowMs = Date.now();
  +  if (Math.abs(nowMs - Number(parsed.ts) * 1000) > 5 * 60 * 1000) {
  +    throw new Error("MP signature timestamp out of tolerance");
  +  }
  ```

  Use the existing `equalSignature` helper at the top of `provider.ts` (~line 49) for the constant-time compare. Add a tiny `hmacSha256Hex` helper using `crypto.subtle.sign` (Workers-compatible).

- Verify:
  - Add a test under `apps/web/src/__tests__/payments/` that feeds a canonical MP sample payload + matching signature and asserts success, then flips one byte of the signature and asserts the handler throws.
  - `npm run test` passes.
  - E2E: from MP dashboard, send a test notification. Tail the Worker logs (`npx wrangler tail`) and confirm success.
- Rollback: `git revert <sha>`. Pre-fix code was insecure but functional — rollback is safe for emergency only.
- Suggested commit message: `fix(payments): verify mercado pago webhooks via hmac`

### 1.5 Harden Stripe and mock webhook comparisons (F4-7, F4-8) — co-land with 1.4

- What this fixes: `AUDIT.md` F4-7 (Stripe signature accepts arbitrarily old timestamps), F4-8 (mock provider uses `!==` instead of constant-time compare).
- Why it matters: F4-7 enables replay attacks on captured Stripe payloads; F4-8 is a timing side channel on the mock webhook secret.
- Prerequisites: Step 1.4 merged (reuse the same `equalSignature` helper).
- Actions:
  - `apps/web/src/server/payments/provider.ts:71-80` (Stripe): add `if (Math.abs(Date.now() - Number(parsed.timestamp) * 1000) > 5 * 60 * 1000) throw new Error("Stripe signature timestamp out of tolerance");` *after* the HMAC check.
  - `apps/web/src/server/payments/provider.ts:104` (mock): replace `if (signature !== config.mockWebhookSecret)` with `if (!equalSignature(signature, config.mockWebhookSecret))`.
- Verify: `npm run test` passes. Add unit tests that craft a valid-signature-but-7-minute-old payload and assert rejection.
- Rollback: `git revert <sha>`.
- Suggested commit message: `fix(payments): reject stale stripe signatures and constant-time mock compare`

### 1.6 Move `spookynexus.com` hardcoding to wrangler environments (F6-1)

- What this fixes: `AUDIT.md` F6-1 — production domain is baked into `apps/web/wrangler.jsonc:14-26`.
- Why it matters: committing the real domain is a secret-hygiene smell; if it is a placeholder, the next deploy will ship to an uncontrolled domain. Either way, environment-scoped config is the right home.
- Prerequisites: confirm with the domain owner whether `spookynexus.com` is the intended production domain. Have the replacement in hand (or confirm).
- Actions (edit `apps/web/wrangler.jsonc`, split into `env.preview` and `env.production`):

  ```jsonc
  // Sketch — adapt to the current structure
  "env": {
    "preview": {
      "vars": {
        "APP_BASE_URL": "https://preview.<yourdomain>",
        "ADMIN_BASE_URL": "https://admin.preview.<yourdomain>",
        "NEXTAUTH_URL": "https://preview.<yourdomain>"
      },
      "routes": [
        { "pattern": "preview.<yourdomain>/*", "custom_domain": true },
        { "pattern": "admin.preview.<yourdomain>/*", "custom_domain": true }
      ]
    },
    "production": {
      "vars": { "APP_BASE_URL": "...", "ADMIN_BASE_URL": "...", "NEXTAUTH_URL": "..." },
      "routes": [ /* prod routes */ ]
    }
  }
  ```

  Update `apps/web/package.json` `cf:deploy` / `cf:deploy:preview` scripts to pass `--env production` / `--env preview`.

- Verify: `npx wrangler deploy --dry-run --env preview` succeeds; same for `--env production`. `npm run cf:preflight` passes.
- Rollback: `git revert <sha>`. Since you changed config, also redeploy the previous Worker version from Step 0.2.
- Suggested commit message: `chore(cf): split wrangler config into preview and production envs`

### 1.7 Flip `ADMIN_REQUIRE_CF_ACCESS` on and provision Access (F2-1)

- What this fixes: `AUDIT.md` F2-1 — admin host runs without CF Access in production.
- Why it matters: split host is only defensible when CF Access is in front. Today admin auth reduces to credentials + role, which is insufficient for an admin surface.
- Prerequisites:
  - In Cloudflare → Zero Trust → Access: create an Application scoped to `admin.<yourdomain>`, attach an Identity Provider (SSO or One-Time PIN), attach an Access policy that allowlists only the operator emails.
  - Decide whether CF Access should also protect `admin.<yourdomain>/api/auth/*` (Step 1.8 enforces that — land this step then immediately follow with 1.8; do not deploy 1.7 without 1.8 queued).
- Actions (edit `apps/web/wrangler.jsonc`, `env.production.vars`):

  ```diff
  -      "ADMIN_REQUIRE_CF_ACCESS": "false"
  +      "ADMIN_REQUIRE_CF_ACCESS": "true"
  ```

  Keep `env.preview.vars.ADMIN_REQUIRE_CF_ACCESS` set to `"false"` if preview admin access is still open for E2E.

- Verify:
  - From an allowlisted identity: `https://admin.<yourdomain>/admin` loads after CF Access challenge.
  - From an un-allowlisted browser: you receive the CF Access reject page, not the admin shell.
  - Hit an admin server action without the `cf-access-authenticated-user-email` header (use `curl` with `Host:` override); expect the `assertAdminHostAccess` helper at `apps/web/src/server/admin/role-guard.ts:84-93` to throw `forbidden`.
- Rollback: set back to `"false"` and redeploy. Keep the CF Access application in place for re-enable.
- Suggested commit message: `fix(security): require cloudflare access on production admin host`

### 1.8 Extend CF Access enforcement to `/api/auth/*` on the admin host (F3-2)

- What this fixes: `AUDIT.md` F3-2 — middleware whitelists `/api/auth/*` for CF Access enforcement, so `admin.<yourdomain>/api/auth/signin` bypasses CF Access even when the flag is on.
- Why it matters: once Step 1.7 is merged this latent bypass becomes active.
- Prerequisites: Step 1.7 merged.
- Actions (edit `apps/web/src/middleware.ts`, around the CF Access enforcement block near lines 38-42):

  ```diff
  -  if (isAdminPath(pathname) && adminRequireCfAccess) {
  +  // F3-2: on the admin host, require CF Access for any path (admin UI + /api/auth/*).
  +  if (
  +    adminRequireCfAccess &&
  +    (isAdminHost(requestHost, policy) || isAdminPath(pathname))
  +  ) {
       const cfIdentity = request.headers.get("cf-access-authenticated-user-email");
       if (!cfIdentity) {
         return new NextResponse("Cloudflare Access required", { status: 403 });
       }
     }
  ```

  `isAdminHost` is a one-liner helper (or inline the `requestHost === policy.adminHost` check). Keep the storefront host exempt.

- Verify:
  - `curl -i https://admin.<yourdomain>/api/auth/csrf` without CF Access → 403.
  - Same URL with CF Access cookie set → normal NextAuth response.
  - Storefront auth routes remain callable as before.
  - Add a unit test under `apps/web/src/__tests__/config/host-policy.test.ts` for the branch (addresses F3-7 simultaneously).
- Rollback: `git revert <sha>`.
- Suggested commit message: `fix(security): enforce cf access on admin api auth routes`

### 1.9 Add approval gate and preview-then-promote to the deploy workflow (F8-1)

- What this fixes: `AUDIT.md` F8-1 — current deploy ships on every push to `main` with no approval, no preview, no rollback story.
- Why it matters: combined with F8-2 (already fixed in Step 1.2) this is the last blocker on "every merge is a prod deploy with no brakes".
- Prerequisites:
  - Decide who the approvers are.
  - In GitHub → Settings → Environments: create `production` and attach *Required reviewers* = those people. Create `preview` with no reviewers.
- Actions (edit `.github/workflows/deploy-cloudflare.yml`, restructure to two jobs):

  ```yaml
  jobs:
    deploy-preview:
      runs-on: ubuntu-latest
      environment: preview
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with: { node-version-file: "package.json" }
        - run: npm ci --include=optional
        - run: npm run cf:preflight
        - run: npx wrangler d1 migrations apply DB --remote --env preview
          env:
            CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
            CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        - run: npx wrangler deploy --env preview
          env:
            CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
            CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        - name: Smoke test
          run: curl -fsS https://preview.<yourdomain>/api/health || exit 1

    deploy-production:
      needs: deploy-preview
      runs-on: ubuntu-latest
      environment: production
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with: { node-version-file: "package.json" }
        - run: npm ci --include=optional
        - run: npm run cf:preflight
        - run: npx wrangler d1 migrations apply DB --remote --env production
        - run: npx wrangler deploy --env production
  ```

  Add a manual `workflow_dispatch` rollback job that accepts a `sha` input and redeploys from that ref (`git checkout "$sha" && npx wrangler deploy --env production`).

- Verify:
  - Open a PR that modifies a trivial comment; merge it. Confirm `deploy-preview` runs, smoke test passes, and `deploy-production` waits on the required reviewer.
  - Approve the review. Confirm production deploy proceeds.
  - Run the rollback job against the previous commit SHA; confirm the production Worker version id reverts.
- Rollback: restore the previous single-job workflow from `git`. Production will keep whatever was last deployed.
- Suggested commit message: `fix(ci): gate cloudflare deploy on approval with preview smoke test`

### 1.10 Rotate exposed secrets as part of Tier 1 closeout (F2-5)

- What this fixes: `AUDIT.md` F2-5 — `apps/web/.env.local` is gitignored and never hit the remote, but the credentials have been readable in dev environments.
- Why it matters: dev-machine exposure → backup/clipboard/screenshare leak risk. Cheapest risk to eliminate is rotation.
- Prerequisites: Tier 1 payment steps (1.3, 1.4, 1.5) merged so new secrets aren't invalidated by an intervening code change.
- Actions:
  - Rotate: Stripe test key, MP access token, MP webhook secret, any PayPal keys once 1.3 is reversed, NextAuth secret, `AUTH_REFRESH_TOKEN_SECRET`, Resend API key.
  - Update local `apps/web/.dev.vars` and Cloudflare secrets (`wrangler secret put <NAME>`).
  - Add a pre-commit hook (or a `lint-staged` entry) that blocks commits containing `sk_`, `rk_`, `whsec_`, `APP_USR-`, or `AIza` substrings.
- Verify: `grep -RIn "sk_\|whsec_\|APP_USR-" apps/web/.env.local` matches the *new* values; old values no longer authenticate against the respective providers.
- Rollback: re-issue the old secrets at the provider if a rollback is required (usually not possible; plan rotation for off-hours).
- Suggested commit message: `chore(security): add secret prefix pre-commit guard` (the rotation itself is not a commit).

---

## Step 2 — Short-term (HIGH, before the next feature release)

Sequenced smallest/safest → largest.

### 2.1 Add security headers / baseline CSP (F2-2)

- What this fixes: `AUDIT.md` F2-2 — no `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, or CSP anywhere.
- Why it matters: clickjacking, MIME sniffing, mixed content, and third-party script injection have no edge defence today.
- Prerequisites: confirm whether you inline any third-party scripts. If yes, list the allowed origins before starting.
- Actions (pick one of two approaches):
  - **Option A — `next.config.ts` `headers()`**. Export an async `headers()` returning the header set for `/*`; add a stricter block for `/admin/*` (`X-Frame-Options: DENY`).
  - **Option B — in `apps/web/src/middleware.ts`** on every response, append the same headers. Use this if you want a per-host CSP (admin stricter than storefront).

  Starter CSP (report-only first, then enforce after one week):

  ```text
  default-src 'self';
  script-src 'self' 'nonce-<REQUEST_NONCE>' https://js.stripe.com https://www.mercadopago.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https:;
  connect-src 'self' https://api.stripe.com https://api.mercadopago.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  ```

- Verify:
  - `curl -sI https://preview.<yourdomain>/ | grep -iE 'strict-transport|x-frame|x-content-type|referrer-policy|permissions-policy|content-security-policy'` shows every header.
  - https://securityheaders.com gives at least an `A`.
  - Browser devtools console shows no CSP violations on any first-party page; any that appear go on the allowlist before flipping from report-only to enforce.
- Rollback: `git revert <sha>`.
- Suggested commit message: `feat(security): add baseline response headers and report-only csp`

### 2.2 Revoke refresh sessions on password reset (F3-1)

- What this fixes: `AUDIT.md` F3-1.
- Why it matters: if the user reset their password because they suspected compromise, an attacker's refresh session survives today.
- Prerequisites: none.
- Actions (edit `apps/web/src/server/auth/service.ts` inside `resetPasswordByToken`, around lines 169-177, after the `UPDATE users` and the token delete):

  ```diff
     // existing: hash new password, update users row, delete reset token
  +  // F3-1: revoke all refresh sessions for this user so surviving attacker sessions die.
  +  await revokeAllRefreshSessionsForUser({ userId: user.id });
  ```

  Import `revokeAllRefreshSessionsForUser` from `@/server/auth/refresh-sessions`. Mirror the same call into any future password-change endpoint.

- Verify: add a test that (a) creates a user, (b) creates a refresh session, (c) triggers password reset, (d) asserts `listActiveRefreshSessions(userId).length === 0`. E2E: reset password in one browser; confirm the other browser's next refresh returns 401.
- Rollback: `git revert <sha>`.
- Suggested commit message: `fix(auth): revoke refresh sessions on password reset`

### 2.3 Rewrite migration 0004 with single-quoted strings and regenerate the Drizzle journal (F5-1, F5-3)

- What this fixes: `AUDIT.md` F5-1 (double-quoted string literals in `0004_d05_remove_inventory_reservations.sql:8-15` rely on a deprecated SQLite fallback) and F5-3 (no `drizzle/migrations/meta/` directory).
- Why it matters: F5-1 is one SQLite flag flip away from silent UPDATE no-ops; F5-3 means `drizzle-kit check` is unusable.
- Prerequisites: Step 0.2 snapshot (this step only touches the SQL file; already-applied migrations on prod D1 are untouched, but be safe).
- Actions:
  - Replace every double-quoted *value* with single quotes in the migration file. Leave double quotes on *identifiers* (column/table names) only.

    ```diff
    -  UPDATE "orders"
    -     SET "status" = "paid"
    -   WHERE "status" = "payment_review_required"
    -     AND "paymentStatus" = "succeeded";
    +  UPDATE "orders"
    +     SET status = 'paid'
    +   WHERE status = 'payment_review_required'
    +     AND "paymentStatus" = 'succeeded';
    ```

  - Regenerate the Drizzle journal:

    ```bash
    npx drizzle-kit generate --config apps/web/drizzle.config.ts
    # inspect the newly created apps/web/drizzle/migrations/meta/_journal.json
    git add apps/web/drizzle/migrations/meta
    ```

  - Do **not** re-number existing migrations. If `drizzle-kit generate` wants to emit a new migration that diffs identical, delete it before committing.

- Verify:
  - `npx drizzle-kit check --config apps/web/drizzle.config.ts` exits 0.
  - `npm run db:migrate:local` on a fresh DB applies all migrations cleanly.
  - On a copy of prod D1 (restored from Step 0.2 backup to a preview D1): `npx wrangler d1 migrations apply DB --remote --env preview` reports `No migrations to apply` (because the migration content is already applied and D1 tracks by name).
- Rollback: `git revert <sha>`.
- Suggested commit message: `fix(db): quote migration 0004 string literals and add drizzle journal`

### 2.4 PayPal webhook signature verification + production API URL (F4-1, F4-2 full fix)

- What this fixes: `AUDIT.md` F4-1, F4-2. Step 1.3 disabled the provider; this step enables it correctly.
- Why it matters: re-enables PayPal as a real revenue channel. Do this only after Steps 1.3–1.5 have landed.
- Prerequisites:
  - PayPal live credentials present in Cloudflare secrets (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`).
  - `PAYPAL_API_URL` wired in `apps/web/src/server/config/runtime-env.ts` with default `https://api-m.paypal.com` and a dev override to `https://api-m.sandbox.paypal.com`.
- Actions:
  - `apps/web/src/server/payments/provider.ts:341` and `:370`: replace hardcoded sandbox URL with `${config.paypalApiUrl}/…`.
  - `apps/web/src/server/payments/provider.ts:415-449`: before parsing the payload, call PayPal's `/v1/notifications/verify-webhook-signature` endpoint with `transmission_id`, `transmission_time`, `cert_url`, `auth_algo`, `transmission_sig`, `webhook_id`, and the raw body. Reject if `verification_status !== "SUCCESS"`.
  - `apps/web/src/server/payments/provider.ts:438` (and the peer lines at `:216, :325`): remove the `paypal_<randomUUID>` fallback; require a provider-issued id and reject if missing (closes F4-9).
  - Remove the kill-switch from Step 1.3 once all of the above land.
- Verify:
  - Unit tests feeding a captured sample webhook with correct signature → success; with a flipped byte → rejection; with a missing event id → rejection.
  - In PayPal sandbox dashboard, send a `PAYMENT.CAPTURE.COMPLETED` event and confirm the order flips to `paid`.
  - In staging with live credentials (if available), do one real $1 capture end-to-end and refund it.
- Rollback: re-land the Step 1.3 kill-switch.
- Suggested commit message: `fix(payments): verify paypal webhooks and use production api url`

### 2.5 Move rate limiter off in-memory `Map`; add per-email limit on forgot-password (F2-3, F2-4)

- What this fixes: `AUDIT.md` F2-3 (in-memory limiter is per Worker isolate → trivially defeated by scale-out), F2-4 (forgot-password has IP limit only, vulnerable to rotating-IP enumeration).
- Why it matters: this is the authentication surface's first line of defence. It is currently ineffective.
- Prerequisites: pick a backing store. Options: (a) Cloudflare Durable Object keyed by limiter name, (b) Workers KV with eventual consistency (cheap, less accurate), (c) D1 with a short-TTL table and a periodic sweeper. Durable Object is the right answer for correctness.
- Actions:
  - Replace `apps/web/src/server/security/rate-limit.ts:20-26` in-memory Map with a `RateLimiter` Durable Object class exported from a new file (e.g. `apps/web/src/server/security/rate-limit-durable-object.ts`). Update `wrangler.jsonc` with a `durable_objects.bindings` entry.
  - In `apps/web/src/app/api/auth/forgot-password/route.ts`, call the limiter with two keys: `ip:<ip>` and `email:<hash(email)>`. Either failure → 429.
- Verify:
  - Unit tests for the new Durable Object covering window reset and over-limit rejection.
  - E2E: 100 forgot-password requests from 100 rotating IPs for the same email → only the first N succeed, rest 429.
  - `npm run cf:build && ls -lh apps/web/.open-next/worker.js` — confirm bundle is still under 3 MiB.
- Rollback: `git revert <sha>`. The Durable Object binding can remain attached; the code path simply stops using it.
- Suggested commit message: `feat(security): back rate limiter with durable object and rate-limit forgot-password by email`

### 2.6 Wrap order creation and inventory decrement in a batch/transaction (F4-6, F4-10)

- What this fixes: `AUDIT.md` F4-6 (sequential inserts in `createPendingCheckoutOrder`, no atomicity), F4-10 (`Promise.all` inventory decrement is not transactional).
- Why it matters: any failure mid-sequence leaves partial orders / inconsistent stock.
- Prerequisites: none.
- Actions:
  - `apps/web/src/server/orders/service.ts:44-95`: collect the order insert, every `orderItems` insert, and the initial `orderStatusTimeline` insert into one `db.batch([...])` call. D1 supports `batch` natively via Drizzle.
  - `apps/web/src/server/inventory/service.ts` (decrement path): replace `Promise.all` with a `db.batch([...])` that clamps stock to zero and writes the audit row in the same batch.
- Verify:
  - Unit/integration test that forces the third item's insert to throw and asserts zero order rows remain (use a test DB, or mock Drizzle's batch to reject the third statement).
  - E2E: place an order with three line items, confirm only one `orders` row and three `orderItems` rows are created.
- Rollback: `git revert <sha>`.
- Suggested commit message: `fix(orders): batch order creation and inventory decrement for atomicity`

### 2.7 Re-introduce short-TTL inventory holds (F4-5)

- What this fixes: `AUDIT.md` F4-5 — stock is validated at checkout-start but never held, so the last unit can be sold to N buyers before the paid webhook lands.
- Why it matters: overselling is the single most common customer-facing failure in small-catalog commerce.
- Prerequisites: Step 2.6 merged so inventory writes are already batched.
- Actions:
  - New Drizzle migration `0005_reintroduce_inventory_holds.sql`: create `inventoryHold(id, orderId, variantId, quantity, expiresAt)` with `(orderId)` and `(expiresAt)` indexes.
  - At checkout-session creation (`apps/web/src/server/payments/checkout-service.ts`): inside the same `db.batch` that creates the order (from Step 2.6), insert one `inventoryHold` row per variant with `expiresAt = now + 15 minutes`, and decrement `variants.onHand` by the hold quantity. Reject the checkout if the decrement would drop below zero.
  - On webhook success: delete the hold rows for that order (stock is already decremented; the hold becomes the real sale).
  - On webhook failure / payment-session expiry / order cancel: delete holds and `UPDATE variants SET onHand = onHand + hold.quantity`.
  - New route `/api/inventory/sweep` behind the existing but unused `INVENTORY_SWEEPER_TOKEN` env var (closes F4-11): cron-triggered via a Cloudflare Workers cron trigger every 5 minutes, deletes expired holds and returns stock.
- Verify:
  - Integration test: two concurrent checkout-starts for the last unit — one succeeds, the other gets `out_of_stock`.
  - Integration test: order expires without payment → stock returns after sweeper run.
  - E2E: end-to-end happy-path checkout still works.
- Rollback: revert the PR and the migration (add a downgrade `0006_revert_holds.sql` if needed; prefer to keep the column harmless and just stop writing to it).
- Suggested commit message: `feat(inventory): reintroduce short-ttl holds to prevent oversell`

### 2.8 Add E2E to CI; add handler tests for payment webhooks and host-policy helpers (F8-3, F8-4, F8-5, F3-7, F8-9)

- What this fixes: `AUDIT.md` F8-3 (CI does not run Playwright), F8-4 (coverage whitelist reports green with zero tested branches on `route.ts` / `actions.ts`), F8-5 (no test for payment webhooks), F3-7 / F8-9 (host-policy is on the coverage whitelist but has no test).
- Why it matters: Tier 1 and Tier 2 have introduced a lot of net-new behaviour. Without tests in CI, the next refactor silently breaks them.
- Prerequisites: Tier 1 complete, Steps 2.1–2.7 merged.
- Actions:
  - `.github/workflows/ci.yml`: add an `e2e` job after `test`:

    ```yaml
    e2e:
      runs-on: ubuntu-latest
      needs: test
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with: { node-version-file: "package.json" }
        - run: npm ci --include=optional
        - run: npx playwright install --with-deps chromium
        - run: npm run build
        - env:
            PLAYWRIGHT_RUN_DB_BOOTSTRAP: "1"
            PLAYWRIGHT_REUSE_EXISTING_SERVER: "0"
          run: npm run test:e2e
        - if: always()
          uses: actions/upload-artifact@v4
          with:
            name: playwright-report
            path: apps/web/playwright-report
    ```

  - New tests:
    - `apps/web/src/__tests__/payments/webhook-service.test.ts` — feed canonical Stripe, MP, PayPal, and mock payloads (valid + invalid signature + replay + missing id) and assert outcomes.
    - `apps/web/src/__tests__/config/host-policy.test.ts` — cover `isAllowedOnAdminHost`, `resolveHostPolicy`, the admin-exempt branches, and `resolveSharedCookieDomain` (include the ccTLD case from F3-4 as a known-failing test skipped with `.todo`).
    - `apps/web/e2e/auth-session.spec.ts` — covers logout, logout-all, and "session revoked → next request redirects to login" (addresses F8-6).
    - `apps/web/e2e/admin-orders-crud.spec.ts` — covers admin order status transitions and cancellation (addresses F8-7).
- Verify: CI runs green end-to-end on a throwaway PR. Coverage on the whitelist no longer reports green with zero branches exercised.
- Rollback: `git revert <sha>`. The coverage/CI regression is acceptable short-term.
- Suggested commit message: `test(ci): add e2e job and handler tests for payments and host policy`

---

### 2.9 Add bundle-size check to deploy workflow (F7-1)

- What this fixes: `AUDIT.md` F7-1 — Cloudflare Workers 3 MiB bundle ceiling is not measured in CI; an over-limit deploy fails *after* the full build with `code: 10027`.
- Why it matters: catches overages at PR time instead of at deploy time, and prevents Step 2.5 / 2.7 / future features from silently crossing the line.
- Prerequisites: Step 1.2 and Step 1.9 merged (deploy workflow is the place to add it).
- Actions (edit `.github/workflows/deploy-cloudflare.yml` in both the `deploy-preview` and `deploy-production` jobs, after `npm run cf:preflight`):

  ```diff
  +    - name: Build OpenNext bundle
  +      run: npm run cf:build
  +    - name: Assert bundle size < 3 MiB
  +      run: |
  +        size=$(wc -c < apps/web/.open-next/worker.js)
  +        echo "worker.js size: $size bytes"
  +        test "$size" -lt 3145728
  ```

  Also add the same assertion to `.github/workflows/ci.yml` after `npm run build` so PRs fail before merge.

- Verify: on a PR that intentionally adds a large dep (e.g. `import "moment"`), the job fails with the expected `test` exit code. Revert the test change before merging.
- Rollback: `git revert <sha>`.
- Suggested commit message: `fix(ci): fail builds that exceed cloudflare workers 3 mib limit`

### 2.10 Add `Cache-Control` to JSON API responses (F7-2)

- What this fixes: `AUDIT.md` F7-2 — `apps/web/src/app/api/**/route.ts` return `NextResponse.json(...)` without explicit cache headers, so the CF edge can race with user-scoped endpoints.
- Why it matters: cart, orders, viewer, and availability responses can be served from a shared cache tier to the wrong user.
- Prerequisites: none.
- Actions:
  - Create `apps/web/src/server/http/cache-headers.ts` that exports two helpers:

    ```ts
    export const PRIVATE_NO_STORE = { "Cache-Control": "private, no-store" } as const;
    export const PUBLIC_CATALOG = {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    } as const;
    ```

  - Audit every route under `apps/web/src/app/api/**/route.ts`:
    - Mutating routes (`POST`, `PUT`, `PATCH`, `DELETE`) → `PRIVATE_NO_STORE`.
    - User-scoped GET routes (`/api/auth/*`, `/api/cart`, `/api/orders`, `/api/checkout/*`) → `PRIVATE_NO_STORE`.
    - Public catalog-read GETs (`/api/catalog/availability`, etc., if any) → `PUBLIC_CATALOG`.
  - Pass via `NextResponse.json(body, { headers: PRIVATE_NO_STORE })`.
- Verify:
  - `curl -sI https://preview.<yourdomain>/api/cart | grep -i cache-control` returns `private, no-store`.
  - `curl -sI https://preview.<yourdomain>/api/catalog/availability | grep -i cache-control` returns the public variant.
- Rollback: `git revert <sha>`.
- Suggested commit message: `fix(api): add cache-control headers to json routes`

### 2.11 Reject requests that bypass Cloudflare on the Worker (F3-3)

- What this fixes: `AUDIT.md` F3-3 — `x-forwarded-host`, `x-forwarded-for`, etc. are trusted on the assumption the request traversed Cloudflare, but nothing asserts that. If the Worker is ever reachable via a direct IP, preview URL, or misconfigured origin, an attacker defeats the host-split guard by spoofing the headers.
- Why it matters: small latent issue today because Workers are fronted by CF's edge, but defense-in-depth is cheap.
- Prerequisites: confirm the production Worker is only reachable via custom-domain routes (no `workers.dev` subdomain publicly enabled). Check with `curl -i https://<worker-name>.<account>.workers.dev/`; if it returns real content, disable the preview URL in the dashboard first.
- Actions (edit `apps/web/src/middleware.ts`, near the top of the handler, after the early-exit paths):

  ```diff
  +  // F3-3: in production, require that the request actually traversed Cloudflare.
  +  if (process.env.NEXTJS_ENV === "production") {
  +    const cfConnectingIp = request.headers.get("cf-connecting-ip");
  +    if (!cfConnectingIp) {
  +      return new NextResponse("Direct Worker access is not permitted.", { status: 403 });
  +    }
  +  }
  ```

- Verify:
  - From a trusted network via Cloudflare → normal responses.
  - From the `workers.dev` preview URL (temporarily re-enabled for the test) → 403.
- Rollback: `git revert <sha>`.
- Suggested commit message: `fix(security): require cf-connecting-ip header on production worker`

---

## Step 3 — Medium-term (next hardening sprint)

These are lower-priority but still should be scheduled. Quick notes per finding — escalate to full step format when you pick it up.

- **F2-6, F2-7** — Complete the CSP rollout (move from report-only to enforce one week after 2.1); raise password minimum to ≥12 chars or add entropy check in `apps/web/src/server/auth/validation.ts:6`. Commit: `feat(security): enforce stricter password policy`.
- **F3-4** — Integrate a Public Suffix List (e.g. `psl` npm package) into `resolveSharedCookieDomain` at `apps/web/src/server/config/host-policy.ts:163-198`. Commit: `fix(auth): use public suffix list when scoping shared cookies`.
- **F3-5** — Split `AUTH_REFRESH_TOKEN_SECRET` into storefront and admin variants in `apps/web/src/server/config/runtime-env.ts:111-124` and pass surface-specific secret into the keyed hash at `apps/web/src/server/auth/refresh-sessions.ts:20-23`. Commit: `fix(auth): separate admin and storefront refresh-token secrets`.
- **F3-6** — Add `limit`/`cursor` query params to `apps/web/src/app/api/auth/sessions/route.ts`. Commit: `feat(auth): paginate session list endpoint`.
- **F4-12** — Add an allowed-transitions table and assert inside `updateOrderPaymentState` (`apps/web/src/server/orders/service.ts:175-204`). Commit: `fix(orders): enforce legal state transitions`.
- **F4-13** — Cap webhook payload length at 16 KiB in `paymentWebhookEventsTable.payload` insert path. Commit: `fix(payments): cap webhook payload size`.
- **F4-14** — Add `couponRedemption` table; increment inside order-creation batch (Step 2.6). Commit: `feat(orders): track coupon redemptions`.
- **F5-2** — Replace per-order lead-item queries in `listOrdersForUser` / `listOrdersForAdmin` (`apps/web/src/server/orders/service.ts:237-248, :264-275`) with a single `IN (…)` + in-memory group-by. Commit: `perf(orders): remove n+1 lead-item queries`.
- **F5-4** — Add a sweeper that deletes refresh sessions with `expiresAt < now - 30d`; run it on the same cron you set up for F4-5 holds. Commit: `chore(auth): sweep expired refresh sessions`.
- **F5-5** — Remove the redundant `uniqueIndex` on `usersTable.email` in `apps/web/src/server/db/schema.ts`; keep the column-level `.unique()`. Commit: `chore(db): dedupe email unique constraint`.
- **F6-6** — Converge UI primitives — migrate one primitive per PR from `apps/web/src/components/ui` to `packages/ui`. Commit: `refactor(ui): migrate <Primitive> to shared package`.
- **F7-3** — `dynamic(() => import("..."), { ssr: false })` around `apps/web/src/components/admin/dashboard-sales-chart.tsx`. Commit: `perf(admin): dynamic import dashboard chart`.
- **F7-4** — Wire Logpush to R2 or an external sink. Commit: `chore(obs): wire workers logpush destination`.
- **F7-5, F7-8** — Memoise `getAuthOptions()` and `getRuntimeEnvironment()` at module scope. Commit: `perf(auth): memoise nextauth options per worker isolate`.
- **F7-6** — Self-host Inter + Geist Mono subset via `next/font/local`. Commit: `perf(web): self-host storefront fonts`.
- **F9-1, F9-2, F9-3, F9-4** — A11y fixes: `aria-label` on catalog price inputs at `apps/web/src/app/(storefront)/catalog/page.tsx:72-87` (F9-1); `aria-label="Breadcrumb"` + `aria-current="page"` on the PDP breadcrumb `<nav>` (F9-2); `aria-label="Search products"` on header search inputs in `storefront-header.tsx` (F9-3); `aria-expanded` + `aria-controls` on `mobile-filter-toggle.tsx` (F9-4). Commit: `fix(a11y): label storefront controls and expose toggle state`.

---

## Step 4 — Long-term / hygiene

- **F6-2** — One-PR brand consolidation (Cannaculture or Plant Seeds — pick one) across `README.md`, `AGENTS.md`, `RESEND_FROM_EMAIL`, page titles, OG metadata. Commit: `chore(brand): consolidate product identity to <Name>`.
- **F6-3** — Throw on startup if `RESEND_FROM_EMAIL` is unset in production (remove the `noreply@example.com` fallback). Commit: `fix(email): require resend from address in production`.
- **F6-4** — Replace the five literal `ChangeMe123!` copies with a `DEV_OWNER_PASSWORD` env-var lookup in `README.md:46`, `AGENTS.md:53`, `apps/web/scripts/seed-auth-dev.mjs:14`, `apps/web/e2e/helpers/auth.ts:61`, `apps/web/e2e/auth-flows.spec.ts:70`. Commit: `chore(seed): require dev owner password via env var`.
- **F6-5** — Delete `apps/web/playwright-test.config.ts`. Commit: `chore(test): remove stale playwright config`.
- **F6-7** — Extract a `useHydratedValue` hook to replace the three `react-hooks/set-state-in-effect` pragmas. Commit: `refactor(ui): extract useHydratedValue hook`.
- **F6-8** — Add a justification comment next to the file-level disable at `apps/web/src/components/admin/data-table.tsx:1`. Commit: `chore(admin): document data-table eslint disable`.
- **F5-6** — Delete the duplicate `substrates-101` entry at `apps/web/src/server/data/storefront-db.ts:747-758`. Commit: `fix(content): remove duplicate substrates-101 news fixture`.
- **F5-7** — Port `apps/web/scripts/seed-*.mjs` to parameterised inserts. Commit: `chore(seed): use parameterised inserts in dev seed scripts`.
- **F7-7** — Export `revalidate = 3600` from `apps/web/src/app/sitemap.ts` and `robots.ts`. Commit: `perf(seo): cache sitemap and robots at the edge`.
- **F9-5** — Skip-to-main-content link in `apps/web/src/app/(storefront)/layout.tsx`. Commit: `fix(a11y): add skip-to-main-content link`.
- **F9-6** — Add `/checkout` to the `disallow` list in `apps/web/src/app/robots.ts:13-23`. Commit: `fix(seo): disallow checkout routes in robots`.
- **F1-1** — Already covered in Step 0.4.

---

## Verification protocol

Use this checklist at the end of every step before marking it done:

1. `npm run lint` → exit 0.
2. `npm run typecheck` → exit 0, zero errors.
3. `npm run test` → exit 0, coverage ≥ 90% on the whitelist (if the step adds tested surface, confirm they run).
4. `npm run build` → exit 0. For any step that touches `wrangler.jsonc`, also `npm run cf:build` and confirm `apps/web/.open-next/worker.js` is < 3 MiB: `wc -c < apps/web/.open-next/worker.js` should print a number less than `3145728`.
5. For Tier 1 and Tier 2: `npm run test:e2e` → exit 0.
6. Manual smoke tests specific to the step (listed in each step's **Verify** block).
7. Deploy to preview: `npx wrangler deploy --env preview`. Hit the relevant URL (admin or storefront, depending on the step), exercise one happy-path flow.
8. Only after preview is green: merge to `main`. The Tier 1-1.9 deploy gate will promote to production after the approval.

---

## When something goes wrong

General rollback flow:

1. Identify the bad commit: `git log --oneline origin/main | head -10`.
2. If the Worker is live and broken, redeploy the previous SHA via the manual rollback job from Step 1.9 (or `git checkout <sha> && npx wrangler deploy --env production` from a trusted workstation).
3. If the D1 schema is broken, restore from the Step 0.2 backup: `npx wrangler d1 execute DB --remote --file ./backups/d1-prod-<timestamp>.sql`.
4. Open a revert PR: `git revert -m 1 <merge-sha>`, land it through the same approval gate.

Surface-specific rollback:

- Payment webhook regression (Tier 1.4, 1.5, 2.4) → revert the provider.ts change first, then rotate the webhook secret so any captured-in-flight requests re-fail signature check.
- Auth session regression (Tier 2.2, 3 F3-5) → `UPDATE refreshSessions SET revokedAt = now` and force all users to sign in again. Painful but bounded.
- Deploy workflow regression (Tier 1.2, 1.9) → revert the workflow file; redeploy manually with `npx wrangler deploy --env production`.
- Rate limiter regression (Tier 2.5) → temporarily relax limits to previous values via env var; do not bypass the limiter entirely.

Escalation: if a Tier 1 fix causes customer-facing errors in production for more than 15 minutes, revert first and diagnose on a branch — do not debug forward on `main`.

---

## Printable checklist

### Tier 0 — Pre-flight

- [ ] 0.1  Clean toolchain baseline (`lint`, `typecheck`, `test`, `build`, `test:e2e`, `npm audit`) all green
- [ ] 0.2  D1 production snapshot captured in `./backups/`; current deployment SHA recorded
- [ ] 0.3  Working branch created
- [ ] 0.4  `*.tsbuildinfo` gitignored *(optional)*

### Tier 1 — Immediate

- [ ] 1.1  Mock complete route guarded to dev builds — F4-4
- [ ] 1.2  D1 migrations step added to deploy workflow — F8-2
- [ ] 1.3  PayPal provider disabled in production — F4-1, F4-2 kill-switch
- [ ] 1.4  Mercado Pago HMAC verification — F4-3
- [ ] 1.5  Stripe timestamp tolerance + mock constant-time compare — F4-7, F4-8
- [ ] 1.6  `spookynexus.com` moved to wrangler environments — F6-1
- [ ] 1.7  `ADMIN_REQUIRE_CF_ACCESS=true` + CF Access provisioned — F2-1
- [ ] 1.8  CF Access enforced on admin `/api/auth/*` — F3-2
- [ ] 1.9  Approval gate + preview-then-promote + rollback job — F8-1
- [ ] 1.10 Exposed secrets rotated; pre-commit secret scanner — F2-5

### Tier 2 — Short-term

- [ ] 2.1  Security headers + report-only CSP — F2-2
- [ ] 2.2  Refresh sessions revoked on password reset — F3-1
- [ ] 2.3  Migration 0004 requoted; Drizzle journal regenerated — F5-1, F5-3
- [ ] 2.4  PayPal signature verification + production API URL — F4-1, F4-2 full fix, F4-9
- [ ] 2.5  Rate limiter moved to Durable Object; per-email forgot-password — F2-3, F2-4
- [ ] 2.6  Order creation + inventory decrement batched — F4-6, F4-10
- [ ] 2.7  Inventory holds reintroduced; sweeper wired to `INVENTORY_SWEEPER_TOKEN` — F4-5, F4-11
- [ ] 2.8  E2E job in CI; payments + host-policy tests — F8-3, F8-4, F8-5, F3-7, F8-9, F8-6, F8-7
- [ ] 2.9  Bundle-size check in CI / deploy — F7-1
- [ ] 2.10 `Cache-Control` on JSON API routes — F7-2
- [ ] 2.11 Reject non-CF traffic on production Worker — F3-3

### Tier 3 — Medium-term

- [ ] CSP enforced (from report-only) + password complexity — F2-6, F2-7
- [ ] Public Suffix List for shared cookie domain — F3-4
- [ ] Split admin/storefront refresh-token secrets — F3-5
- [ ] Paginate session list endpoint — F3-6
- [ ] Order state-transition guard — F4-12
- [ ] Webhook payload size cap — F4-13
- [ ] Coupon redemption tracking — F4-14
- [ ] Fix N+1 in order listings — F5-2
- [ ] Refresh-session sweeper — F5-4
- [ ] Dedupe email unique constraint — F5-5
- [ ] Converge UI primitives — F6-6
- [ ] Dynamic-import admin chart — F7-3
- [ ] Wire observability destination — F7-4
- [ ] Memoise NextAuth options + runtime env — F7-5, F7-8
- [ ] Self-host fonts — F7-6
- [ ] A11y labels (F9-1 … F9-4)

### Tier 4 — Long-term / hygiene

- [ ] Brand consolidation — F6-2
- [ ] Require `RESEND_FROM_EMAIL` in prod — F6-3
- [ ] Seed password via env var — F6-4
- [ ] Delete stale `playwright-test.config.ts` — F6-5
- [ ] `useHydratedValue` hook — F6-7
- [ ] Justify `data-table.tsx` eslint-disable — F6-8
- [ ] Remove duplicate `substrates-101` fixture — F5-6
- [ ] Parameterised seed inserts — F5-7
- [ ] `revalidate` on sitemap + robots — F7-7
- [ ] Skip-to-main-content link — F9-5
- [ ] `/checkout` in robots disallow — F9-6

Cross-reference: every checklist item maps back to a finding id in `AUDIT.md`. When a Tier item is complete, tick the box and close the tracking issue against that finding id.
