# Guest to Authenticated Cart Merge Flow

## Problem solved

Users add items before logging in. After login, cart contents must be merged into the authenticated server cart without losing intent or violating stock constraints.

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
6. In local E2E runs, use split hosts:
   - storefront: `http://storefront.lvh.me:3000`
   - admin: `http://admin.lvh.me:3000`

## How it works

- Guest cart comes from local storage.
- Server cart is loaded from D1 for authenticated user.
- Merge key is `variantId`.
- Quantities merge and clamp to available stock.
- Unavailable lines are kept with warning reason and excluded from checkout subtotal.
- Merge summary reports merged/adjusted/unavailable outcomes.
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
- Merge summary contract:
  - `mergedLines`
  - `adjustedLines`
  - `unavailableLines`
  - `messages`

## Failure modes and edge cases

- Variant removed after guest add.
- Variant stock drops below merged quantity.
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
