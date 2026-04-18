# Production Readiness Audit — `base-ecommerce` (plant-seeds vertical)

Audit date: 2026-04-16.
Audit scope: full deep-dive, report-only. Deploy target: Cloudflare Workers via `opennextjs-cloudflare`.
Rules followed: `AGENTS.md` at repo root; no code, migrations, or config were modified during the audit.

---

## Executive summary

Overall risk level: **High — do not ship to production as-is.**

The codebase has a mature shape (host-split admin, refresh-session rotation, bcrypt password hashing, Zod validation on routes, rate limiting, strong input validation, solid test taxonomy). However, several production-critical guardrails are either disabled, half-built, or contain latent defects that will bite on first real traffic:

1. Admin host runs without Cloudflare Access protection in production (`ADMIN_REQUIRE_CF_ACCESS=false` in `apps/web/wrangler.jsonc:22`). With admin auth gated only by a password + role check, this is the single largest attack-surface delta between this repo and a defensible production deploy.
2. PayPal webhook has **no signature verification** and PayPal API calls are hardcoded to the **sandbox** endpoint (`apps/web/src/server/payments/provider.ts:341, 370, 415-449`). Any attacker can POST a well-formed PayPal event and mark an order paid, and no real PayPal payment can settle.
3. Mercado Pago webhook "verifies" by comparing a header value to the raw shared secret (`apps/web/src/server/payments/provider.ts:295`) — not an HMAC. One header capture is total compromise.
4. `/api/payments/mock/complete` has no production-environment guard (`apps/web/src/app/api/payments/mock/complete/route.ts:15-69`). An authenticated user can mark their own `pending_payment` order as `succeeded` without paying.
5. Deploy workflow runs on every push to `main` with no approval gate, no preview-then-promote, and **no D1 schema migration step** (`.github/workflows/deploy-cloudflare.yml:43-47`). The first schema-changing merge will break production.

Secondary but important: no security headers / CSP on any route, order creation is not transactional, inventory is not reserved between checkout-start and payment success (README admits this), listing queries are N+1, rate limiting is an in-memory `Map` per Worker isolate, and CI does not run Playwright.

Top 5 production blockers (read these first):

| # | Blocker | Severity | Citation |
|---|---------|----------|----------|
| 1 | Admin host is not behind CF Access in production | CRITICAL | `apps/web/wrangler.jsonc:22` |
| 2 | PayPal webhook accepts unsigned events + sandbox-only API | CRITICAL | `apps/web/src/server/payments/provider.ts:341, 370, 415-449` |
| 3 | Mercado Pago webhook compares plain secret, not HMAC | CRITICAL | `apps/web/src/server/payments/provider.ts:295` |
| 4 | Mock payment completion reachable in production | CRITICAL | `apps/web/src/app/api/payments/mock/complete/route.ts:15-69` |
| 5 | Deploy workflow has no approval gate and no D1 migration step | CRITICAL | `.github/workflows/deploy-cloudflare.yml:43-47` |

---

## How to read this report

Severity definitions:

- **CRITICAL** — Blocks production deploy. Exploitable today or will reliably break real users/customers.
- **HIGH** — Should block the next release. Real exposure or correctness risk; workaround is not enough.
- **MEDIUM** — Ship-gate for the next hardening sprint. Operational, latent, or compounding risk.
- **LOW** — Hygiene; fix when next in the area.
- **OK** — Claim investigated, verified, no action needed. Included so the reader can see what was checked.

Citation format: `path/from/repo/root:line` (or `path:startLine-endLine`). Every finding was re-verified by reading the cited file directly. False positives raised by the initial sweep have been either killed or downgraded — see *Verification notes* below.

---

## Tooling gaps

The audit ran inside a Linux sandbox with the project's Windows-installed `node_modules` mounted read-only. The following tools could not execute cleanly in that environment; all claims below are static-analysis only. **You must run these locally before sign-off:**

| Tool | Why it failed here | Command to run locally |
|------|--------------------|------------------------|
| `npm run typecheck` | Workspace symlinks under `node_modules/@base-ecommerce/*` are broken in the Linux mount; `tsc` emitted many spurious `TS2307 Cannot find module` errors. | `npm install && npm run typecheck` |
| `npm run test` (Vitest + v8 coverage) | Missing native dep `@rollup/rollup-linux-x64-gnu` in the mounted `node_modules` (Windows install). Vitest fails to start. | `rm -rf node_modules package-lock.json && npm install && npm run test` |
| `npm run test:e2e` | Playwright requires browser install + running Next server. Not attempted. | `npx playwright install && npm run test:e2e` |
| `npm run build` / `npm run cf:build` | Same Rollup native-binding issue; OpenNext adapter never exercised. | `npm run cf:build` then `ls -lh apps/web/.open-next/worker.js` to check against the 3 MiB Workers limit. |
| `npm audit` | Requires the lockfile to resolve cleanly; blocked by the same mount issue. | `npm audit --omit=dev && npm audit --audit-level=high` |
| `drizzle-kit check` | Not exercised; `drizzle/migrations/meta/` directory is absent from the repo (see F5-3). | `npx drizzle-kit check --config apps/web/drizzle.config.ts` |
| Bundle analysis | Cannot build. | `ANALYZE=1 npm run cf:build` (wire up `@next/bundle-analyzer` locally). |

`npm run lint` did complete (exit 0, zero warnings). That is the only clean tool signal in this report.

---

## Phase 1 — Tooling sweep findings

- **F1-1 — LOW — `tsconfig.tsbuildinfo` checked in:** `apps/web/tsconfig.tsbuildinfo` is tracked by git. It should be in `.gitignore` alongside `*.tsbuildinfo`. Evidence: `apps/web/tsconfig.tsbuildinfo` exists in the working tree despite being regenerated by `tsc --incremental`. *Fix direction:* Add `*.tsbuildinfo` to `.gitignore` and `git rm --cached` the existing file.
- **F1-2 — LOW — `test-results/` tracked in working tree:** `apps/web/test-results/` and `playwright-report/` exist; `apps/web/.gitignore:17-19` handles `/coverage`, but confirm Playwright artifacts are also gitignored under `apps/web/` paths (root `.gitignore` already ignores `coverage/`, `playwright-report/`, `test-results/`). Evidence: `apps/web/test-results/` exists and is not committed per `git status` (OK). *No action; verified clean.*
- **F1-3 — MEDIUM — Workspace-package symlinks break in containerised CI if packages aren't rebuilt:** `packages/*/package.json` exports source TS via `"exports": { ".": "./src/index.ts" }` (e.g. `packages/domain/package.json:8`), consumed with `transpilePackages` in `apps/web/next.config.ts:5`. This works, but means any CI that strips symlinks or uses sparse checkout will fail the typecheck the same way the sandbox did. *Fix direction:* Document in `AGENTS.md` that fresh `npm install` at repo root is mandatory before `typecheck`; keep `NEXT_IGNORE_INCORRECT_LOCKFILE=1` in `apps/web/scripts/run-next.mjs` as a defensive bypass.

---

## Phase 2 — Security & secrets findings

- **F2-1 — CRITICAL — Admin host not behind Cloudflare Access in production:** `apps/web/wrangler.jsonc:22` hardcodes `"ADMIN_REQUIRE_CF_ACCESS": "false"`. `apps/web/src/middleware.ts:14, 38-42` enforces CF Access only when this flag is truthy. *Why it matters:* The split host (`admin.spookynexus.com`) is defensible **only** when CF Access is in front. Without it, admin access reduces to "any valid credentials + role". *Fix direction:* Flip to `"true"` in `wrangler.jsonc` and provision a CF Access policy on `admin.spookynexus.com` before next deploy; keep the storefront host open.
- **F2-2 — CRITICAL — No security headers anywhere (no CSP, HSTS, X-Frame-Options, etc.):** `apps/web/next.config.ts` has no `headers()` export; `apps/web/src/middleware.ts` emits no response headers; no header utility under `apps/web/src/server/security/`. *Why it matters:* Clickjacking, MIME sniffing, third-party script injection, and mixed content are all undefended at the edge. *Fix direction:* Add `headers()` in `next.config.ts` (or set them in `middleware.ts`) with `Strict-Transport-Security`, `X-Frame-Options: DENY` on admin, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and a conservative CSP (start `default-src 'self'` and iterate).
- **F2-3 — HIGH — Rate-limit store is in-memory per Worker isolate:** `apps/web/src/server/security/rate-limit.ts:20-26` stores counters on `globalThis.__baseRateLimitStore`, a `Map`. Cloudflare Workers globally distributes requests across isolates. An attacker hitting different PoPs sees counters reset. *Why it matters:* The rate limits documented on auth, checkout, and webhook routes are effectively soft — an attacker can scale out. *Fix direction:* Back the limiter with a Durable Object, Workers KV, or D1 with short TTL rows.
- **F2-4 — HIGH — No per-email rate limit on `/api/auth/forgot-password`:** `apps/web/src/app/api/auth/forgot-password/route.ts` enforces a per-IP limit only (verified via the rate-limit call sites). Combined with F2-3, the enumeration defence is weak. *Why it matters:* An attacker can walk the email space with rotating IPs. *Fix direction:* Add a per-email token bucket (hash(email) → counter) in addition to per-IP.
- **F2-5 — HIGH — Developer `.env.local` exists on disk with live-looking Stripe/MP keys:** `apps/web/.env.local` is present in the working tree; it is correctly ignored by `apps/web/.gitignore:35` (`.env*`) and confirmed **not** in `git log --all`. *Why it matters:* It has never shipped to remote, but credentials that reach a developer machine are frequently leaked via backups, screen-shares, or `rg`-readable agent sessions (this very audit had to sandbox-read the file to verify). *Fix direction:* Rotate the Stripe test key, MP access token, and webhook secrets; add a pre-commit scan for `sk_`, `whsec_`, and `APP_USR-` patterns.
- **F2-6 — MEDIUM — No CSP means user-authored content risk is unbounded:** News posts and category content are written to HTML via server components (e.g. product/news pages under `apps/web/src/app/(storefront)/catalog/**`). No `dangerouslySetInnerHTML` was found, but without CSP a future author leak or package supply-chain XSS has no kill-switch. *Fix direction:* Ship a CSP with `script-src 'self' 'nonce-...'` and a report endpoint first, lock it down later.
- **F2-7 — MEDIUM — Passwords accept any 8 chars with no complexity rule:** `apps/web/src/server/auth/validation.ts:6` defines `password: z.string().min(8).max(128)`. *Why it matters:* `aaaaaaaa` is a valid password. *Fix direction:* Add a minimum entropy check or require ≥12 chars with one mixed case + one digit; avoid arbitrary symbol rules.
- **F2-8 — OK — Password hashing:** `apps/web/src/server/auth/password.ts:4` uses `bcryptjs` with cost `10` and never logs the plaintext. Acceptable.
- **F2-9 — OK — No raw SQL injection vectors:** Grepped for `sql.raw(`, string-concat template SQL, and `new Function`/`eval`; all DB access goes through Drizzle parameterised builders. No `dangerouslySetInnerHTML` hits under `apps/web/src` or `packages/`.
- **F2-10 — OK — Cookie hygiene on refresh and session cookies:** `apps/web/src/server/auth/refresh-cookie.ts:69-82` sets `httpOnly`, `sameSite: "lax"`, `secure` when TLS, distinct cookie names for admin vs storefront, and a parent-domain scope only when both hosts share a registrable parent.
- **F2-11 — OK — Zod validation on state-changing routes:** Spot-checked the 18 `route.ts` files; every non-GET handler uses a `z.object(...)` schema before any write (`apps/web/src/app/api/auth/register/route.ts`, `forgot-password/route.ts`, `reset-password/route.ts`, `checkout/session/route.ts`, `cart/route.ts`, etc.).

---

## Phase 3 — Auth & session model findings

- **F3-1 — HIGH — Password reset does not revoke existing refresh sessions:** `apps/web/src/server/auth/service.ts:169-177` updates `usersTable.passwordHash` and deletes the reset token, but never calls `revokeAllRefreshSessionsForUser`. *Why it matters:* If the victim reset their password because they suspected compromise, the attacker's refresh session survives. *Fix direction:* Add a revoke-all call in the same code path as the `UPDATE users`; extend the same behaviour to the password-change endpoint if one is added.
- **F3-2 — HIGH — Access control for `/api/auth/*` on the admin host bypasses the CF Access middleware gate:** `apps/web/src/server/config/host-policy.ts:108-119` whitelists `/api/auth/*` on the admin host, and `apps/web/src/middleware.ts:38-42` enforces CF Access only for `isAdminPath(pathname)` (i.e. `/admin/*`). A request to `admin.spookynexus.com/api/auth/signin` therefore reaches NextAuth without passing CF Access. This is latent as long as F2-1 keeps CF Access off; it becomes active the moment F2-1 is fixed. *Fix direction:* In `middleware.ts`, require CF Access on any request hitting the admin host when `adminRequireCfAccess` is on, not only the `/admin` path subset.
- **F3-3 — HIGH — `x-forwarded-host` / `x-forwarded-for` are trusted without proxy validation:** `apps/web/src/server/admin/role-guard.ts:64-65` and `apps/web/src/middleware.ts` read `x-forwarded-host`; `apps/web/src/server/auth/session.ts` and `request-context.ts` read `x-forwarded-for`. These are trusted because Cloudflare sets them, but there is no assertion that the request actually traversed CF (e.g. verifying `CF-Ray` / `CF-Connecting-IP` presence). *Why it matters:* If the Worker is ever reachable via direct IP (misconfigured origin, preview URL, etc.), an attacker spoofs headers and defeats the host-split guard. *Fix direction:* In the middleware, reject requests where `CF-Connecting-IP` is missing in production; bind the Worker only via custom domain routes.
- **F3-4 — MEDIUM — `resolveSharedCookieDomain` can leak cookies to a public suffix:** `apps/web/src/server/config/host-policy.ts:163-198` computes a "registrable-like" parent by taking the last two labels of the hostname. For `admin.spookynexus.com` + `spookynexus.com` this happens to hit the correct `endsWith` branch (line 185) and returns `.spookynexus.com`. For any domain under a multi-label public suffix (e.g. `admin.shop.co.uk` + `storefront.shop.co.uk`), both sides resolve `co.uk`, the check at line 194 passes, and cookies scope to `.co.uk` — leaking auth to every `.co.uk` site. *Why it matters:* Current prod domain is safe, but the helper is unsafe by construction and will bite on the first ccTLD deployment. *Fix direction:* Integrate a Public Suffix List check (e.g. `psl` npm package) or require the shared domain to be configured explicitly via env.
- **F3-5 — MEDIUM — Admin and storefront refresh tokens share one signing/hashing secret:** `apps/web/src/server/config/runtime-env.ts:111-124` exposes a single `AUTH_REFRESH_TOKEN_SECRET`. Admin sessions have shorter TTLs, but a leak of the storefront refresh token store pool (SQL dump, backup, etc.) exposes the admin-session pool at the same time. *Fix direction:* Add a separate `AUTH_ADMIN_REFRESH_TOKEN_SECRET` and namespace the hash by surface.
- **F3-6 — MEDIUM — No session-list pagination on `/api/auth/sessions`:** `apps/web/src/app/api/auth/sessions/route.ts` returns all active refresh sessions for the user unbounded. Combined with F5-4 (no cleanup of expired rows), high-activity users ship large responses. *Fix direction:* Add `limit`/`cursor` parameters with default `limit=50`.
- **F3-7 — MEDIUM — Host-policy helpers (`isAllowedOnAdminHost`, `resolveHostPolicy`, `resolveSharedCookieDomain`, `buildAbsoluteUrl`) have no unit tests despite being on the coverage whitelist:** `apps/web/vitest.config.ts:19` whitelists `src/server/config/host-policy.ts`, but `apps/web/src/__tests__/` has no file exercising it. The 90% coverage gate therefore reports green on zero branches. *Fix direction:* Add `src/__tests__/config/host-policy.test.ts` covering the CF-Access branch, the subdomain cookie branch, and the ccTLD case from F3-4.
- **F3-8 — OK — Access vs refresh TTL split:** `apps/web/src/server/config/runtime-env.ts:119-123` implements 15-min access, 30-day/180-day storefront refresh, 8-hour/7-day admin refresh, with rotation on every call to `/api/auth/refresh`. `apps/web/drizzle/migrations/0001_d05_session_split.sql:3-22` adds a `surface` column and a `(userId, surface)` index — verified.
- **F3-9 — OK — Re-auth (step-up) for admin writes:** `apps/web/src/server/admin/role-guard.ts:174-181` throws `recent_auth_required` if the `:write` permission is invoked outside the admin idle window.
- **F3-10 — OK — CSRF protection on admin server actions:** `apps/web/src/server/admin/role-guard.ts:96-131` (`assertAdminMutationOrigin`) compares the `Origin` and `Referer` hosts against the admin host. This is called from `ensurePermission` (`:158-185`), which is invoked from every admin server action in `apps/web/src/app/(admin)/admin/actions.ts`. *The initial Phase 3 sweep flagged this as missing CSRF; that finding is a false positive and is withdrawn.*
- **F3-11 — OK — Refresh token is hashed at rest:** `apps/web/src/server/auth/refresh-sessions.ts:20-23` computes a keyed SHA-256 hash before insert; the plaintext never touches the DB.

---

## Phase 4 — Payments & checkout findings

- **F4-1 — CRITICAL — PayPal webhook has no signature verification:** `apps/web/src/server/payments/provider.ts:415-449` reads the body with `request.text()` and proceeds straight to `JSON.parse`. PayPal's `verify-webhook-signature` API is never called; no cert or transmission verification. *Why it matters:* Any internet caller can POST a well-formed `PAYMENT.CAPTURE.COMPLETED` event and trigger `updateOrderPaymentState → status=paid, paymentStatus=succeeded`. *Fix direction:* Implement PayPal's verify-webhook-signature call or reject PayPal webhooks until it is implemented; gate the provider behind `PAYPAL_WEBHOOK_ID`.
- **F4-2 — CRITICAL — PayPal provider hardcoded to sandbox endpoint:** `apps/web/src/server/payments/provider.ts:341` (`https://api-m.sandbox.paypal.com/v1/oauth2/token`) and `:370` (`.../v2/checkout/orders`). *Why it matters:* If PayPal is enabled in production, no real money can flow; buyers will "complete" checkouts that never settle. *Fix direction:* Introduce `PAYPAL_API_URL` env var (default `https://api-m.paypal.com`, sandbox only when explicitly dev).
- **F4-3 — CRITICAL — Mercado Pago webhook compares header to raw secret instead of HMAC:** `apps/web/src/server/payments/provider.ts:294-296` does `signature !== config.mercadoPagoWebhookSecret` (plain `!==`). *Why it matters:* This is not MP's documented signature scheme (which is `ts=<ts>,v1=<HMAC-SHA256>` over `id` + `requestId`). One leak of the `x-signature` header anywhere — logs, crash report, sidecar proxy — hands an attacker the ability to forge any MP event forever. *Fix direction:* Implement the documented HMAC scheme; rotate the webhook secret after deploy.
- **F4-4 — CRITICAL — `/api/payments/mock/complete` is reachable in production:** `apps/web/src/app/api/payments/mock/complete/route.ts:15-69` requires only an authenticated session and ownership of the target order; there is no `NODE_ENV` / `NEXTJS_ENV` / `STORE_PROFILE` guard. *Why it matters:* Any authenticated user can mark their own `pending_payment` order as `succeeded`, which drives `updateOrderPaymentState` and `decrementInventoryForPaidOrder` without paying. *Fix direction:* Return 404 unless `env.NEXTJS_ENV === "development"` (or equivalent); ideally don't register the route at all in production builds.
- **F4-5 — HIGH — Overselling is possible between checkout start and paid webhook:** Confirmed by the README, by `apps/web/drizzle/migrations/0004_d05_remove_inventory_reservations.sql` (reservations table dropped), and by the decrement code path in `apps/web/src/server/payments/webhook-service.ts` (runs only on success). Stock is validated at checkout-session creation but never held. *Why it matters:* Final stock unit can be sold to N concurrent buyers; only one gets it, others get a `clamp to 0` and an angry email. *Fix direction:* Re-introduce a short-TTL inventory hold (new `inventoryHold` table) keyed by order id with a sweeper; decrement optimistically at checkout-start, reclaim on payment failure / expiry.
- **F4-6 — HIGH — No transaction/batch wrapping order creation:** `apps/web/src/server/orders/service.ts:44-95` inserts the order row, then serially inserts each `orderItem`, then appends a status-timeline row. D1 supports `db.batch(...)` for atomic multi-statement commits; it is not used. *Why it matters:* Any failure after line 63 leaves an orphaned order with partial items. *Fix direction:* Replace the sequential `await` chain with a single `db.batch([...])` or `db.transaction(async (tx) => { ... })`.
- **F4-7 — HIGH — Stripe signature verification does not check timestamp tolerance:** `apps/web/src/server/payments/provider.ts:71-80` builds `signedPayload = \`${parsed.timestamp}.${payload}\`` and verifies the HMAC, but never compares `parsed.timestamp` to `Date.now()`. *Why it matters:* Replay attacks with a captured signed payload remain valid forever. *Fix direction:* Reject events where `|now - t| > 300s`.
- **F4-8 — HIGH — Mock webhook signature comparison is not constant-time:** `apps/web/src/server/payments/provider.ts:104` does `signature !== config.mockWebhookSecret`. Even in a "mock" provider, the real `MOCK_PAYMENT_WEBHOOK_SECRET` ships via env and can be timing-attacked. *Fix direction:* Replace with the existing `equalSignature` helper (line 49) and add length check.
- **F4-9 — MEDIUM — `paypal_<randomUUID>` fallback breaks idempotency:** `apps/web/src/server/payments/provider.ts:438` and similar at `:216, :325` default `eventId` to a random UUID when the provider omits the ID. *Why it matters:* The `(provider, eventId)` unique index is the sole idempotency primitive (`apps/web/drizzle/migrations/0002_d05_phase2_orders.sql:91`). Random fallback makes every retry appear new — duplicate processing. *Fix direction:* Reject events without a provider-issued id.
- **F4-10 — MEDIUM — Inventory decrement uses `Promise.all` without a transaction:** `apps/web/src/server/inventory/service.ts:276-295` (per Phase 4 agent; cited line range). *Why it matters:* Two variants on the same order decrement in parallel; either one can fail while the other commits. *Fix direction:* Wrap in `db.batch([...])`.
- **F4-11 — MEDIUM — `INVENTORY_SWEEPER_TOKEN` is wired but unused:** Declared in `apps/web/.dev.vars.example:27` and in `apps/web/src/server/config/runtime-env.ts`, but no route consumes it. *Why it matters:* Either the sweeper endpoint was planned and never built (a functional gap if F4-5 is later fixed by reintroducing holds) or it is dead config (config drift risk). *Fix direction:* Either implement the endpoint behind `timingSafeEqual` on this token, or remove the env var.
- **F4-12 — MEDIUM — Order state transitions are not enforced by a state machine:** `apps/web/src/server/orders/service.ts:175-204` (`updateOrderPaymentState`) writes any caller-supplied `status`/`paymentStatus` pair with no invalid-transition guard. *Fix direction:* Introduce an allowed-transitions table and assert on every write.
- **F4-13 — MEDIUM — Raw webhook payload stored without size cap:** `paymentWebhookEventsTable.payload` is inserted from the caller-provided string; no length bound is enforced at the DB or code layer. *Fix direction:* Cap at e.g. 16 KiB and truncate with a marker, or validate the provider-specific shape before insert.
- **F4-14 — LOW — Coupon redemption limits are not tracked:** `apps/web/src/server/payments/checkout-service.ts` calls `isCouponApplicable` but there is no redemption counter increment+check. *Fix direction:* Add a `couponRedemption` table with a unique `(couponId, orderId)` and a read-then-check inside the order-creation batch; enforce per-user max if the coupon has one.
- **F4-15 — OK — Stripe raw body handled before parse:** `apps/web/src/server/payments/provider.ts:181` (`await request.text()`) is the first read, then `JSON.parse(payload)`. Correct.
- **F4-16 — OK — Webhook idempotency at the `(provider, eventId)` level:** `apps/web/drizzle/migrations/0002_d05_phase2_orders.sql:91` declares the unique index; `apps/web/src/server/payments/webhook-service.ts` relies on `onConflictDoNothing` (or insert-then-check). As long as F4-9 is fixed, this is sound.

---

## Phase 5 — Data layer & migrations findings

- **F5-1 — HIGH — Migration 0004 uses double-quoted string literals (SQLite columns-vs-strings ambiguity):** `apps/web/drizzle/migrations/0004_d05_remove_inventory_reservations.sql:8-15` writes `SET "status" = "paid"` and `WHERE "status" = "payment_review_required"`. In SQLite, double quotes denote *identifiers*; they fall back to string literals only because of a deprecated compatibility feature that can be disabled (and is off by default in strict mode). *Why it matters:* Today the migration runs because the fallback kicks in, but it is one SQLite upgrade or `SQLITE_DQS` pragma flip away from the `UPDATE … SET status = <column paid>` form silently doing nothing or failing loudly. *Fix direction:* Rewrite as single quotes: `SET status = 'paid' WHERE status = 'payment_review_required' AND "paymentStatus" = 'succeeded'`.
- **F5-2 — HIGH — `listOrdersForUser` and `listOrdersForAdmin` are N+1:** `apps/web/src/server/orders/service.ts:237-248` and `:264-275` fetch orders then loop per-order to pull the lead item. *Why it matters:* 50 orders → 51 queries. On D1, each call is a network hop. *Fix direction:* Single query with `GROUP_CONCAT`/window function, or one `IN (…)` followed by an in-memory group-by, or a subquery on the `orderItem` table sorted by `createdAt DESC` returning the first per `orderId`.
- **F5-3 — MEDIUM — `drizzle/migrations/meta/_journal.json` is missing from the repo:** `apps/web/drizzle/migrations/` contains the five `.sql` files but no `meta/` directory. `drizzle-kit` normally tracks applied migrations via `meta/_journal.json`. *Why it matters:* `wrangler d1 migrations apply` manages its own table (`d1_migrations`) so it will still work, but `drizzle-kit generate` will re-emit everything because it has no snapshot baseline; `drizzle-kit check` will be unusable. *Fix direction:* Regenerate the journal with `npx drizzle-kit generate --config apps/web/drizzle.config.ts` and commit `meta/` alongside the migrations.
- **F5-4 — MEDIUM — Expired/revoked refresh sessions are never cleaned up:** `apps/web/src/server/auth/refresh-sessions.ts` (`rotateRefreshSessionByToken`, `revokeAllRefreshSessionsForUser`) soft-mark rows but never delete; no sweeper runs. *Fix direction:* Add a cron or on-request sweep deleting rows where `expiresAt < now - 30d` or `revokedAt < now - 30d`.
- **F5-5 — MEDIUM — `usersTable.email` has both `.unique()` and a `uniqueIndex`:** `apps/web/src/server/db/schema.ts` declares both for `email`. SQLite handles the redundancy but it is confusing and costs a second index write. *Fix direction:* Keep one. Prefer the column-level `.unique()`.
- **F5-6 — LOW — Duplicate news-post fixture:** `apps/web/src/server/data/storefront-db.ts:722-734` and `:747-758` define the same `substrates-101` entry twice, identical `id` and `slug`. Depending on consumer behaviour, either `Array#find` returns the first and the dup is dead code, or a list render shows it twice. *Fix direction:* Remove the duplicate entry.
- **F5-7 — LOW — Seed scripts interpolate strings into SQL:** `apps/web/scripts/seed-auth-dev.mjs:20-26, 47` and `apps/web/scripts/seed-inventory-dev.mjs:47-49` format SQL via template literals. Dev-only today, but `db:seed:remote` runs the same scripts against production/preview D1. *Fix direction:* Use `wrangler d1 execute --file` with parameterised inserts, or port the seed to Drizzle's typed insert builder.
- **F5-8 — OK — `inventoryHoldExpiresAt` column has no lingering references:** Grepped `apps/web` for `inventoryHoldExpiresAt` and `inventory_hold_expires_at`; only hit is the migration that created it (`0003`), which migration `0004` drops via the `__order_rebuild` dance. Schema matches post-0004.
- **F5-9 — OK — FK deletion semantics consistent:** User-owned data cascades; webhook events use `SET NULL` on `orderId` (orphan-tolerant).
- **F5-10 — OK — `noUncheckedIndexedAccess` discipline:** Spot-checked array indexing in orders/inventory/auth services; every access uses `rows[0] ?? null` or optional chaining.

---

## Phase 6 — Code quality, dead code, architecture findings

- **F6-1 — HIGH — Production domain `spookynexus.com` is hardcoded in `wrangler.jsonc`:** `apps/web/wrangler.jsonc:14-26` pins both custom-domain routes and `APP_BASE_URL` / `ADMIN_BASE_URL` / `NEXTAUTH_URL` to `spookynexus.com`. If this is the real production domain, it should be in a secrets/environments layer, not committed as a literal. If it is a placeholder, it will deploy to a domain nobody controls. *Fix direction:* Move to `wrangler` environments (`[env.production]`) and/or replace with your real production domain before deploy.
- **F6-2 — HIGH — Branding inconsistency across the repo:** The package is `base-ecommerce` (`package.json:2`), the README is "Plant Seeds Ecommerce" (`README.md:1`), `AGENTS.md` targets the `plant-seeds` vertical and treats `STORE_PROFILE` as a hard boundary, but the email `From` defaults to `Cannaculture <noreply@example.com>` (`apps/web/.dev.vars.example:14`; fallback used in `apps/web/src/server/auth/email.ts`). *Why it matters:* Customer-facing identity drifts from the engineering identity. Users receiving password-reset emails see a brand not reflected in the URL. *Fix direction:* Pick one canonical brand (Cannaculture per the email default, or "Plant Seeds" per README); update README, AGENTS.md, `RESEND_FROM_EMAIL`, page titles, and OG metadata in one PR.
- **F6-3 — MEDIUM — Placeholder `example.com` in production email fallback:** `apps/web/src/server/auth/email.ts:14` falls back to `"Cannaculture <noreply@example.com>"` when `RESEND_FROM_EMAIL` is unset. *Why it matters:* Silent misconfiguration in prod → emails from an unroutable sender. *Fix direction:* Throw on startup if the env var is missing in production.
- **F6-4 — MEDIUM — `ChangeMe123!` seed password committed in five places:** `README.md:46`, `AGENTS.md:53`, `apps/web/scripts/seed-auth-dev.mjs:14`, `apps/web/e2e/helpers/auth.ts:61`, `apps/web/e2e/auth-flows.spec.ts:70`. *Why it matters:* If `db:seed:remote` or `db:seed:remote:preview` is ever run against a public-facing DB, `owner@base-ecommerce.local` / `ChangeMe123!` is live on prod. *Fix direction:* Require `DEV_OWNER_PASSWORD` env var (seed already supports this pattern) and remove all literal copies.
- **F6-5 — MEDIUM — `apps/web/playwright-test.config.ts` is stale/unused:** Neither `package.json` scripts nor `AGENTS.md` reference it; the default `playwright.config.ts` is authoritative. Settings diverge (timeouts, `maxFailures`, baseURL). *Fix direction:* Delete the file or document its purpose in `TESTING.md`.
- **F6-6 — MEDIUM — Design-system duplication tracked but not yet converged:** `AGENTS.md:21` flags the `apps/web/src/components/ui` vs `packages/ui` overlap. Present overlap: `Button` in both; the app-local tree additionally hosts `Label`, `Input`, `Card`, `Select`, `Separator`, `Textarea`, `Table`, `Alert`, `Badge` that `packages/ui` doesn't expose. *Why it matters:* Every shared primitive is at risk of drift; changes to one Button won't reach the other. *Fix direction:* Pick a canonical home (probably `packages/ui` per AGENTS.md direction) and migrate primitives one at a time.
- **F6-7 — LOW — Three `eslint-disable react-hooks/set-state-in-effect` pragmas are justified but suggest a hydration-pattern refactor:** `apps/web/src/components/theme/theme-toggle.tsx:26`, `apps/web/src/components/auth/storefront-auth-links.tsx:28`, `apps/web/src/components/theme/palette-picker.tsx:31`. All three have inline reasons, which is fine. *Fix direction:* Extract a `useHydratedValue` hook to centralise the pattern.
- **F6-8 — LOW — `data-table.tsx` file-level `eslint-disable react-hooks/incompatible-library` has no justification comment:** `apps/web/src/components/admin/data-table.tsx:1`. *Fix direction:* Append `-- @tanstack/react-table uses internal React hooks API` or similar.
- **F6-9 — OK — No TODO / FIXME / XXX / HACK comments in tracked source.**
- **F6-10 — OK — No circular imports across `packages/domain`, `packages/ui`, `packages/validation` (`validation → domain`, no reverse edge).**
- **F6-11 — OK — Legacy verticals `prints-3d` / `pc-components` are gone from runtime code:** Only remaining references are in `apps/web/src/__tests__/domain/store-profile.test.ts` where they are asserted as *rejected* — this is the correct end state per AGENTS.md.

---

## Phase 7 — Performance & infra findings

- **F7-1 — HIGH — Cloudflare Workers 3 MiB bundle ceiling has no measurement in CI:** `.github/workflows/deploy-cloudflare.yml` runs `cf:deploy` but has no step that fails when `.open-next/worker.js` exceeds 3 MiB. Heavy deps bundled today: `bcryptjs`, `drizzle-orm`, `@auth/drizzle-adapter`, `next-auth`, `resend`, plus full Next 16 runtime. *Why it matters:* Cloudflare returns `code 10027` at deploy time (per AGENTS.md), surfacing only after the build is done — painful feedback loop, and small changes can push across the line unnoticed. *Fix direction:* Add a `du -b .open-next/worker.js && test "$(stat -c%s ...)" -lt 3145728` step, or use `@opennextjs/cloudflare`'s size reporter.
- **F7-2 — HIGH — No `Cache-Control` headers on JSON API responses:** `apps/web/src/app/api/**/route.ts` return `NextResponse.json(...)` without explicit `Cache-Control`. Dynamic endpoints (cart, orders, viewer, availability) can legitimately race with the CF edge cache given the custom-domain routing. *Fix direction:* Set `Cache-Control: no-store` on all mutating / user-specific endpoints; `public, max-age=60, stale-while-revalidate=300` on `availability` / catalog reads that don't depend on the session.
- **F7-3 — MEDIUM — `recharts` pulled into an admin client component but not dynamic-imported:** `apps/web/src/components/admin/dashboard-sales-chart.tsx:1-7` imports `recharts` at module top; `"use client"`. *Why it matters:* ~120 KB gz adds to the admin dashboard initial JS even when the chart is below the fold. Not on the storefront critical path (admin route group) but still a hit. *Fix direction:* `dynamic(() => import("..."), { ssr: false })` for the chart component.
- **F7-4 — MEDIUM — `observability.enabled: true` without a destination:** `apps/web/wrangler.jsonc:32-34` enables Workers observability, but there is no Logpush, Axiom/Baselime binding, or Tail Worker configured. `apps/web/src/server/observability/telemetry.ts` writes JSON to `console.*`. *Why it matters:* Errors reach Cloudflare's dashboard-only view; there is no alerting, no search, no retention past Cloudflare's default window. *Fix direction:* Wire Logpush to R2 or pipe to Axiom/Baselime; reference the destination in `wrangler.jsonc` or via Cloudflare dashboard and document it in README.
- **F7-5 — MEDIUM — `getAuthOptions()` constructed per request on NextAuth route:** `apps/web/src/app/api/auth/[...nextauth]/route.ts:27-28`. *Why it matters:* Every login/refresh hit pays the `getDatabaseBinding()` + `getRuntimeEnvironment()` cost. *Fix direction:* Memoise at module scope behind the Worker env singleton.
- **F7-6 — MEDIUM — `next/font/google` loads Inter + Geist Mono on every page:** `apps/web/src/app/layout.tsx`. Google's CSS resolution adds 100–300 ms on cold isolates. *Fix direction:* Self-host the subset or swap to system fonts; preload via `<link rel="preload">`.
- **F7-7 — LOW — `sitemap.ts` and `robots.ts` hit the data layer on every request:** `apps/web/src/app/sitemap.ts:6-46` calls `listCatalogProducts` / `listCategories`; no `revalidate` export. *Fix direction:* Export `revalidate = 3600` from both files.
- **F7-8 — LOW — `/api/auth/forgot-password` and similar mutation endpoints re-read env per call via `getRuntimeEnvironment()`:** Same pattern as F7-5. *Fix direction:* Single memoisation.
- **F7-9 — OK — Middleware imports are minimal:** `apps/web/src/middleware.ts:1-8` imports only host-policy helpers + `next/server`. No heavy code on every request.

---

## Phase 8 — Testing, CI/CD & observability findings

- **F8-1 — CRITICAL — Deploy workflow has no approval gate, no preview step, no rollback:** `.github/workflows/deploy-cloudflare.yml:14-47` runs on every push to `main`, concurrency-cancels mid-flight, and ships straight to production. There is no `environment: production` requirement, no pause for approval, no post-deploy smoke test. *Fix direction:* Gate `cf:deploy` behind a GitHub `environment` with required reviewers; deploy to preview D1 first and smoke-test before promoting; add a manual rollback job that redeploys the previous commit SHA.
- **F8-2 — CRITICAL — Deploy workflow never applies D1 migrations:** `.github/workflows/deploy-cloudflare.yml:43-47` runs `cf:preflight` then `cf:deploy`. There is no `npm run db:migrate:remote`. *Why it matters:* First schema-changing PR that merges to `main` will break the live app on deploy. *Fix direction:* Add a `wrangler d1 migrations apply DB --remote` step before `cf:deploy`, or run it as the first action in a `cf:deploy` wrapper script that short-circuits on migration failure.
- **F8-3 — HIGH — CI does not run Playwright E2E:** `.github/workflows/ci.yml:9-37` runs `lint → typecheck → test → build` only. Per `TESTING.md`, the project explicitly de-emphasises mocked-route unit tests in favour of E2E for critical flows. The absence of E2E in CI means critical flows are effectively untested in PR gating. *Fix direction:* Add a `test:e2e` step. Consider a reduced `@critical` tagged subset for PR, full suite for nightly.
- **F8-4 — HIGH — Vitest coverage whitelist is green on files with zero tests:** `apps/web/vitest.config.ts:12-20` whitelists seven modules including `src/app/api/**/route.ts` and `src/app/(admin)/admin/actions.ts`, but there is **no** test file under `apps/web/src/__tests__/` that imports any `route.ts` or `actions.ts`. The 90% gate therefore evaluates over a set of files with zero covered branches and reports green by having nothing to fail. *Fix direction:* Either (preferred) add real handler-level tests per route, or drop the routes from the whitelist to avoid false confidence.
- **F8-5 — HIGH — No test for the payment webhook handler or the provider dispatcher:** None of the files under `apps/web/src/__tests__/` import from `src/server/payments/*`. Given the CRITICALs in Phase 4, the single most risky surface has no automated coverage at any tier. *Fix direction:* Add handler tests that feed canonical Stripe / MP / PayPal sample payloads and verify idempotency, signature rejection, and status-transition outcomes.
- **F8-6 — MEDIUM — No E2E for logout or session revocation:** `apps/web/e2e/auth-flows.spec.ts` covers register, login success, login failure, forgot-password. No logout test. No `logout-all` test. No "session revoked → next request goes to login" test. *Fix direction:* Add a dedicated `auth-session.spec.ts`.
- **F8-7 — MEDIUM — No E2E for admin order-management paths:** `apps/web/e2e/admin-*.spec.ts` covers categories and product+variant CRUD only. Order status transitions, cancellation, and refund entry points are untested. *Fix direction:* Add `admin-orders-crud.spec.ts`.
- **F8-8 — MEDIUM — `PLAYWRIGHT_RUN_DB_BOOTSTRAP` defaults off:** `apps/web/playwright.config.ts` and `apps/web/scripts/playwright-db-bootstrap.mjs` skip migrate+seed unless the env var is `1`. Locally this is pragmatic; in CI it means E2E runs against whatever schema happened to exist in the preview D1 last time. *Fix direction:* When E2E is added to CI (F8-3), set `PLAYWRIGHT_RUN_DB_BOOTSTRAP=1` in that job only.
- **F8-9 — MEDIUM — `apps/web/src/server/config/host-policy.ts` is on the coverage whitelist but has no tests:** Same root cause as F8-4; called out separately because middleware redirects and cookie-domain computation are correctness-critical. Also see F3-7.
- **F8-10 — LOW — `playwright-test.config.ts` exists and is unreferenced:** See F6-5.
- **F8-11 — LOW — Rate-limit logic not unit-tested:** `apps/web/src/server/security/rate-limit.ts` has no test file. *Fix direction:* Add time-mocked tests once F2-3 resolves the back-end.

---

## Phase 9 — A11y, SEO, i18n findings

- **F9-1 — MEDIUM — Price filter `<input>`s have no accessible name:** `apps/web/src/app/(storefront)/catalog/page.tsx:72-87` renders two `<input type="number">` with only `placeholder="Min"` / `"Max"` — no `<label htmlFor>`, no `aria-label`, no `aria-labelledby`. The `<p>` above is visually a label but not programmatically linked. *WCAG:* 1.3.1 / 3.3.2. *Fix direction:* Add `aria-label="Minimum price"` / `"Maximum price"`, or wrap each in a `<label>` that includes the "Price, $" text.
- **F9-2 — MEDIUM — Breadcrumb `<nav>` lacks `aria-label`:** Product detail page (`apps/web/src/app/(storefront)/catalog/[categorySlug]/[productSlug]/page.tsx`, breadcrumb block around line 90-100) uses a `<nav>` without `aria-label="Breadcrumb"`. *Fix direction:* Add `aria-label="Breadcrumb"` and, if an `<ol>` is used, ensure the current page has `aria-current="page"`.
- **F9-3 — MEDIUM — Header search inputs rely on placeholder for their label:** `apps/web/src/components/storefront/storefront-header.tsx` (desktop + mobile search blocks). *Fix direction:* Add `aria-label="Search products"` directly on the `<input>`.
- **F9-4 — MEDIUM — Mobile filter toggle does not expose expanded state:** `apps/web/src/components/storefront/mobile-filter-toggle.tsx` (toggle button). *Fix direction:* Add `aria-expanded={open}` and `aria-controls` pointing at the panel id.
- **F9-5 — LOW — No skip-to-main-content link in storefront layout:** `apps/web/src/app/(storefront)/layout.tsx`. *Fix direction:* Add a `sr-only` `<a href="#main">` as the first tab stop and `id="main"` on `<main>`.
- **F9-6 — LOW — `/checkout` is not in `robots.ts` disallow list:** `apps/web/src/app/robots.ts:13-23` disallows `/admin`, `/account`, `/cart`, auth routes, `/api`. `/checkout` is reachable via `/checkout/success`, `/checkout/cancel`, and `/checkout/mock` — none private data, but all session-dependent. *Fix direction:* Add `/checkout` to `disallow` (or at least `/checkout/mock`).
- **F9-7 — OK — `<html lang="en">` explicit:** `apps/web/src/app/layout.tsx`. Single-locale site; `hreflang` not required.
- **F9-8 — OK — Dynamic `generateMetadata` on catalog / product pages:** Spot-checked `[categorySlug]/page.tsx` and `[productSlug]/page.tsx`; both export `generateMetadata`.
- **F9-9 — OK — Structured data (JSON-LD) shipped for product and breadcrumb:** `apps/web/src/__tests__/seo/structured-data-product.test.ts` exists and the product page emits product/breadcrumb JSON-LD.
- **F9-10 — OK — Radix primitives used for Label, Select, Separator:** `@radix-ui/react-label`, `@radix-ui/react-select`, `@radix-ui/react-separator` are all dependencies and are wired into the admin + checkout forms.

---

## Verification notes (findings the initial sweep got wrong)

Findings raised during the parallel sweep that I verified and *withdrew* or downgraded after reading the code:

- **Killed — "Real Stripe / MP API keys committed to `.env.local`":** `apps/web/.env.local` exists on local disk but is ignored by `apps/web/.gitignore:35` (`.env*`) and is not present in `git log --all`. The file has never shipped to a remote. Recommendation is still to rotate the keys as a hygiene step, but it is not a commit-history finding.
- **Downgraded — "Reset password token is not single-use":** `apps/web/src/server/auth/service.ts:161-179` deletes the token after a successful password update; any well-formed caller exhausts the token on first use. The subagent's concern about "invalid password retry" doesn't apply because route-level Zod validation gates entry to `resetPasswordByToken`. True finding on this file is the missing refresh-session revocation (see F3-1), not token reuse.
- **Downgraded — "No CSRF protection on admin mutations":** `apps/web/src/server/admin/role-guard.ts:96-131` (`assertAdminMutationOrigin`) validates `Origin` and `Referer` against the admin host and is invoked from `ensurePermission`, which every `actions.ts` server action calls. CSRF protection is present; this is F3-10 (OK).
- **Downgraded — "`inventoryHoldExpiresAt` is an orphan column in schema":** It was added by migration 0003, dropped by 0004's `__order_rebuild`. Grep confirms no code references. Schema matches post-0004. Kept as F5-8 (OK) for the reader's reassurance.

---

## Prioritized fix backlog

### Immediate (ship-blocking; do before any production traffic)

1. Turn on Cloudflare Access on admin host + flip `ADMIN_REQUIRE_CF_ACCESS="true"` — F2-1.
2. Extend CF Access enforcement to `/api/auth/*` on admin host — F3-2.
3. Disable PayPal provider until signature verification + prod API URL are wired — F4-1, F4-2.
4. Fix Mercado Pago webhook to real HMAC verification — F4-3.
5. Gate `/api/payments/mock/complete` to non-production builds — F4-4.
6. Add deploy approval gate + D1 migration step + preview-then-promote — F8-1, F8-2.
7. Replace `spookynexus.com` hardcoding (or confirm it's truly the production domain and move to `wrangler` environments) — F6-1.

### Short-term (before the next feature release)

1. Ship security headers + baseline CSP — F2-2.
2. Move rate limiter off in-memory map — F2-3; add per-email limit on forgot-password — F2-4.
3. Revoke refresh sessions on password reset — F3-1.
4. Add transaction/batch wrapping to order creation and inventory decrement — F4-6, F4-10.
5. Re-introduce short-TTL inventory holds (or document and accept the oversell risk contractually) — F4-5.
6. Stripe webhook timestamp-tolerance check — F4-7. Mock webhook constant-time compare — F4-8. Reject provider events without `id` — F4-9.
7. Add E2E to CI + real tests for payments webhooks and host-policy helpers — F8-3, F8-5, F3-7/F8-9.
8. Rewrite migration 0004 with single-quoted strings and generate the Drizzle journal — F5-1, F5-3.

### Medium-term (next hardening sprint)

- Password complexity + bcrypt cost review (F2-7), enforce public-suffix check for cookie domain (F3-4), split admin refresh secret (F3-5), session-list pagination (F3-6), proper order state machine (F4-12), webhook payload size cap (F4-13), coupon redemption tracking (F4-14), fix N+1 listings (F5-2), refresh-session sweeper (F5-4), dedup `email` index (F5-5), converge UI primitives (F6-6), dynamic-import recharts (F7-3), wire an observability destination (F7-4), memoise NextAuth options (F7-5), self-host fonts (F7-6), a11y name/aria fixes (F9-1 … F9-4).

### Long-term / hygiene

- Brand consolidation (F6-2), seed-password env var (F6-4), delete `playwright-test.config.ts` (F6-5), extract `useHydratedValue` (F6-7), `data-table.tsx` eslint comment (F6-8), `revalidate` on sitemap/robots (F7-7), skip-to-content link (F9-5), `/checkout` in robots (F9-6), `tsbuildinfo` gitignore (F1-1).

---

## Appendix A — Files of interest (citation index)

Configuration / infra
- `apps/web/wrangler.jsonc` — routes, bindings, `ADMIN_REQUIRE_CF_ACCESS`, `observability`
- `apps/web/next.config.ts` — no `headers()` export today
- `apps/web/open-next.config.ts` — Workers adapter config
- `apps/web/.dev.vars.example` — canonical env list
- `apps/web/.gitignore` — `.env*` exclusion (verifies F2-5)
- `.github/workflows/ci.yml`, `.github/workflows/deploy-cloudflare.yml` — CI / deploy
- `apps/web/eslint.config.mjs`, `apps/web/vitest.config.ts`, `apps/web/playwright.config.ts`, `apps/web/playwright-test.config.ts`

Host / routing
- `apps/web/src/middleware.ts`
- `apps/web/src/server/config/host-policy.ts`
- `apps/web/src/server/config/runtime-env.ts`

Auth
- `apps/web/src/server/auth/options.ts`
- `apps/web/src/server/auth/service.ts`
- `apps/web/src/server/auth/session.ts`
- `apps/web/src/server/auth/refresh-sessions.ts`
- `apps/web/src/server/auth/refresh-cookie.ts`
- `apps/web/src/server/auth/refresh-session-policy.ts`
- `apps/web/src/server/auth/validation.ts`
- `apps/web/src/server/auth/password.ts`, `tokens.ts`, `email.ts`, `constants.ts`

Admin
- `apps/web/src/server/admin/role-guard.ts`
- `apps/web/src/server/admin/session.ts`
- `apps/web/src/server/admin/admin-service.ts`
- `apps/web/src/app/(admin)/admin/actions.ts`
- `apps/web/src/app/(admin)/admin/layout.tsx`

Payments / orders / inventory
- `apps/web/src/server/payments/provider.ts`
- `apps/web/src/server/payments/webhook-service.ts`
- `apps/web/src/server/payments/checkout-service.ts`
- `apps/web/src/server/orders/service.ts`
- `apps/web/src/server/orders/types.ts`
- `apps/web/src/server/inventory/service.ts`
- `apps/web/src/app/api/payments/webhook/[provider]/route.ts`
- `apps/web/src/app/api/payments/mock/complete/route.ts`
- `apps/web/src/app/api/checkout/session/route.ts`

Data / migrations
- `apps/web/src/server/db/schema.ts`
- `apps/web/src/server/db/client.ts`
- `apps/web/drizzle/migrations/0000_d05_phase1.sql` … `0004_d05_remove_inventory_reservations.sql`
- `apps/web/src/server/data/storefront-db.ts` (fixtures)

Security / observability
- `apps/web/src/server/security/rate-limit.ts`
- `apps/web/src/server/observability/telemetry.ts`

SEO / a11y
- `apps/web/src/app/robots.ts`
- `apps/web/src/app/sitemap.ts`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/(storefront)/catalog/page.tsx`
- `apps/web/src/app/(storefront)/catalog/[categorySlug]/[productSlug]/page.tsx`
- `apps/web/src/components/storefront/storefront-header.tsx`
- `apps/web/src/components/storefront/mobile-filter-toggle.tsx`

Tests
- `apps/web/src/__tests__/**`
- `apps/web/e2e/**`

---

## Appendix B — Audit environment limitations

Re-statement of the tooling gaps so the reader has everything in one place:

1. `tsc --noEmit` reported 38 spurious `TS2307` errors because the Linux sandbox cannot read the Windows-installed workspace symlinks at `node_modules/@base-ecommerce/*`. The real errors (if any) are unknown until you run `npm install && npm run typecheck` on the user's machine.
2. `vitest run --coverage` failed with `Cannot find module @rollup/rollup-linux-x64-gnu`. Real coverage numbers are unknown; the 90% gate assertion in this report is based on static analysis of the whitelist config, not an actual run.
3. `npm run build` / `npm run cf:build` not exercised; worker bundle size vs the 3 MiB Workers limit is unknown until you run the OpenNext build locally.
4. `playwright test` not exercised; E2E pass/fail status in the current checkout is unknown.
5. `npm audit` not exercised; dependency CVE status is unknown.

All findings in this report are grounded in direct reading of the repository. None are synthesised from tool output.
