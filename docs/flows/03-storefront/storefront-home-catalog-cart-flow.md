# Storefront Home, Catalog, Product, and Cart Flow

## Problem solved

Customers need a complete browse-and-buy journey from discovery to cart with clear pricing, stock awareness, promotional content, profile-scoped catalog data, and day/night theming.

## User roles and actors

- Customer: browses products, checks details, adds items to cart.
- Admin/content manager: controls banner/news/featured content data.
- Storefront server layer: maps data to customer-facing home and catalog experiences.

## How to use

1. Open `/` to view home sections:
   - news
   - active sales banner
   - featured products
2. Open `/catalog` to browse all products with search and sorting.
3. Open `/catalog/{categorySlug}` for category listing.
4. Open `/catalog/{categorySlug}/{productSlug}` for product details and variant selection.
5. Add product to cart and open `/cart` to adjust quantities or remove items.
6. Use the day/night toggle from the storefront header (or home hero) to switch theme and persist preference.

## How it works

- Home content is mapped from the shared data source using `mapHomeContent`.
- Storefront data is loaded from the active store profile only (`STORE_PROFILE`), preventing mixed vertical runtime catalogs.
- Catalog listing uses server-side filtering and sorting with `listCatalogProducts`.
- Product detail uses route parameters to fetch product + category + variants.
- Cart operations run with a deterministic cart engine:
  - add
  - update quantity
  - remove
  - totals calculation
- Cart persistence uses browser local storage for MVP behavior.
- Theme initialization script applies day/night mode before hydration to avoid flash.
- Theme toggle persists preference in browser storage and updates document-level theme tokens.

## Why this approach

- Server-rendered listing/detail improves SEO and fast first paint.
- Centralized service and mapping functions keep data logic testable.
- Cart engine as pure functions makes boundary and stock rules easy to verify.

## Alternatives considered

- Fully client-side catalog fetching:
  - Faster prototype but weaker SEO and harder cache control.
- Session/server cart from day one:
  - More robust for authenticated users but adds backend complexity too early.

## Data contracts or schemas involved

- Domain entity schemas from `@base-ecommerce/domain`.
- DTO validation contracts from `@base-ecommerce/validation`.
- Storefront data source:
  - categories
  - products
  - variants
  - news
  - promo banners
  - featured sales

## Failure modes and edge cases

- Out-of-stock variants must disable add-to-cart action.
- Quantity updates cannot exceed stock.
- Invalid search/sort values must fallback safely.
- Empty promo window should remove active banner from home.
- Invalid `STORE_PROFILE` must fail fast.
- Theme mismatch between server markup and client hydration must be avoided.

## Observability and debugging

- Unit tests cover home mapping, pricing display, and cart invariants.
- Unit tests cover profile isolation and day/night theme behavior (default, persisted preference, toggle persistence).
- E2E tests cover browse-to-cart path and out-of-stock behavior.
- Route metadata generation can be validated by inspecting rendered head tags.

## Security considerations

- Server-side product lookup validates route parameters through controlled data access.
- Cart persistence is client-side only; no trusted server mutation in this deliverable.
- Input values (quantity, sort/query) are bounded and normalized.

## Tests that validate this flow

- Unit tests:
  - cart boundaries and stock constraints
  - regular vs discounted pricing display
  - home content mapping from data source
  - profile isolation by active `STORE_PROFILE`
  - day/night theme default and toggle persistence
- E2E tests:
  - browse -> product -> add to cart
  - out-of-stock add-to-cart blocked

## Open questions or future improvements

- Move cart persistence to server for authenticated users.
- Add pagination and faceted filtering.
- Add product image gallery and richer variant UX.
