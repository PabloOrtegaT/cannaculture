# Deliverable 03: Storefront (Home + Catalog)

## Objective

Ship the customer-facing MVP browsing experience.

## Scope

- Home page:
  - News section.
  - Sales/discount banner.
  - Featured sales/products.
- Category and product listing pages.
- Product detail page.
- Cart basics.
- Storefront light/dark theme support.

## Implementation checklist

- Build server-rendered home sections driven by database content.
- Implement product listing with filters and sorting.
- Implement product detail variant selection and stock awareness.
- Add cart add/update/remove flows.
- Implement theme provider + theme toggle (day/night) for storefront routes.
- Persist selected theme and avoid hydration mismatch/flash on first paint.
- Ensure shadcn/ui token usage supports both themes with accessible contrast.
- Enforce storefront queries by active store profile so only one vertical catalog appears per fork.
- Implement metadata generation for home, category, and product pages.
- Create storefront flow docs in `docs/flows/03-storefront/` for home, product browse, cart, and theming behavior.

## Unit test requirements

- Cart logic tests (quantity boundaries, stock rules).
- Product pricing display logic tests (regular vs sale price).
- Home content mapping tests from DB data to UI models.
- Theme tests (default theme, toggle behavior, persisted preference).

## Integration/e2e requirements

- E2E for browse -> product -> add to cart.
- E2E for out-of-stock edge case.

## Acceptance criteria

- Home content is editable from admin data and reflected in storefront.
- Product pages work for all three vertical attribute types.
- A fork storefront shows only its active profile data (no mixed vertical products/content).
- Storefront supports day/night themes without hydration flicker and with accessible token contrast.
- Cart flows pass unit and E2E tests.
- Storefront flow docs exist for major customer journeys and SEO metadata behavior.

## Exit artifacts

- Storefront routes and components.
- Reusable storefront theming layer (provider + toggle + persistence).
- Metadata implementation for core public pages.
- Test report with passing cases.
- `docs/flows/03-storefront/storefront-home-catalog-cart-flow.md`.
