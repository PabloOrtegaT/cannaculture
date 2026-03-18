# Guest to Authenticated Cart Merge Flow

## Problem solved

Users add items before logging in and continue editing quantities quickly. Cart state must remain stable without request spam, and server stock must be authoritative after login and during normal authenticated updates.

## User roles and actors

- Guest customer: adds items in local cart.
- Authenticated customer: owns server cart.
- Cart merge service: combines guest + server cart with deterministic rules.

## How to use

1. Add items as guest user.
2. Sign in from `/login`.
3. System redirects to `/auth/sync-cart`.
4. Guest cart is posted to merge endpoint.
5. Merged cart is persisted server-side and reflected on `/cart`.
6. After login, quantity changes in `/cart` use in-flight locking and trailing sync.
7. In local E2E runs, use split hosts:
   - storefront: `http://storefront.lvh.me:3000`
   - admin: `http://admin.lvh.me:3000`

## How it works

- Guest cart comes from local storage.
- Server cart is loaded from D1 for authenticated user.
- Merge key is `variantId`.
- Quantities merge and clamp to available stock.
- Unavailable lines are kept with warning reason and excluded from checkout subtotal.
- Merge summary reports merged/adjusted/unavailable outcomes.
- Authenticated cart writes (`POST /api/cart`) also run server reconciliation (same clamp/unavailable policy) and return canonical cart + sync summary.
- Cart writes are versioned:
  - `GET /api/cart` -> `{ cart, version }`
  - `POST /api/cart` request accepts `{ cart, version? }`
  - stale writes return `409` with latest snapshot/version.
- Client store keeps one in-flight sync and coalesces rapid changes into a trailing latest snapshot.
- On `409` conflict, client store hydrates latest server snapshot and retries the queued user intent with the new version.
- Product page uses `/api/catalog/availability?variantId=...` to disable add-to-cart when no stock is purchasable.
- Cart UI exposes per-line pending state while sync is in flight, preventing rapid update spam and double-submit races.
- Local E2E startup runs D1 migration + seed before server boot to keep merge test fixtures deterministic.
- Local seed resets owner refresh sessions and cart lines so merge test baselines remain deterministic across reruns.

## Why this approach

- Preserves user intent instead of dropping items silently.
- Maintains deterministic and testable merge behavior.
- Keeps server cart as source-of-truth after authentication.

## Alternatives considered

- Remove unavailable lines automatically:
  - Simpler but surprising for users.
- Server guest cart token from day one:
  - Stronger continuity but higher initial complexity.

## Data contracts or schemas involved

- Cart state contract:
  - line identity (`variantId`)
  - line pricing/stock snapshot
  - optional `unavailableReason`
- Cart write contract:
  - request: `{ cart, version? }`
  - success: `{ cart, summary, version }`
  - conflict: `409 { cart, summary, version }`
- Merge summary contract:
  - `mergedLines`
  - `adjustedLines`
  - `unavailableLines`
  - `messages`

## Failure modes and edge cases

- Variant removed after guest add.
- Variant stock drops below merged quantity.
- Rapid quantity clicks causing duplicate writes.
- Invalid guest-cart payload.
- Merge request retries/replays.

## Observability and debugging

- Merge summary is persisted in UI state for user review.
- Merge endpoint returns explicit error codes for unauthorized/invalid payload.
- E2E asserts final login/cart URL hosts remain local test hosts to catch env misrouting.

## Security considerations

- Merge endpoint requires authenticated session.
- Server resolves latest catalog state before final cart persistence.
- Client-side cart values are treated as untrusted input.

## Tests that validate this flow

- Unit tests for merge engine:
  - additive merge
  - stock clamp
  - unavailable preservation
- Integration tests for merge endpoint persistence behavior.

## Open questions or future improvements

- Add merge telemetry counters (merged, adjusted, unavailable per session).
- Add manual line-resolution actions for unavailable items.
- Add cross-device cart conflict handling windows.
