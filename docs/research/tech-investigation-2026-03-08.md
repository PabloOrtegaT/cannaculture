# Technology Investigation (2026-03-08)

## Scope of this investigation

- Zod adoption strategy.
- React Query vs Next.js-native server data patterns.
- SEO metadata and Google discoverability strategy.
- TanStack Table and Recharts fit for admin dashboard.

## Current package versions (npm registry check)

- `next`: `16.1.6`
- `typescript`: `5.9.3`
- `zod`: `4.3.6`
- `@tanstack/react-query`: `5.90.21`
- `@tanstack/react-table`: `8.21.3`
- `recharts`: `3.8.0`

## 1) Zod recommendation

## Decision

Use Zod as the canonical runtime validation layer across:

1. API inputs and outputs.
2. Form data in admin/storefront.
3. Environment/config validation.
4. Admin and storefront form validation.

## Why

- Strong TypeScript inference from runtime schemas.
- Consistent error handling and safer boundaries.
- Reduces duplicated validation logic.

## Implementation pattern

1. Define schema in shared domain module.
2. Infer type from schema.
3. Reuse schema in route handlers, server actions, and form handlers.
4. Return normalized validation errors for UI rendering.

## 2) Next.js server data + React Query + Zustand strategy

## Decision

Use a hybrid policy:

1. Default to Next.js server-first data patterns for read-heavy ecommerce pages.
2. Use React Query only in client-heavy interactive modules (mostly admin dashboard and some cart/checkout UX cases).
3. Use Zustand for lightweight client state that does not replace server data ownership.

## Why

- Next.js App Router supports server fetching, caching, and revalidation natively.
- React Query is still useful for rich client interactions, optimistic updates, polling, and cache invalidation on client-driven workflows.
- Zustand is a good fit for ephemeral/session UX state (for example cart drawer UI state, auth modal state, merge feedback state).
- This avoids unnecessary client complexity on SEO-critical storefront pages.

## Practical rule

1. If data is needed for initial page render and SEO, fetch on the server.
2. If data is user-interactive, rapidly changing, or client-driven, use React Query in a client component boundary.
3. Do not treat React Query as global server state; server state should be handled with Next.js data cache and revalidation mechanisms.
4. Use Zustand for client-only state and UI orchestration; do not duplicate payment/order/catalog source-of-truth data in Zustand.

## 3) SEO metadata and ranking readiness

## Decision

Implement technical SEO as a first-class feature from MVP, including structured data and crawl controls.

## Important note

No framework can guarantee first-page ranking by itself. The base project should maximize technical eligibility and indexability so content and authority can perform.

## Required implementation

1. Use Next.js Metadata API (`metadata` / `generateMetadata`) for all indexable routes.
2. Generate canonical URLs per page.
3. Add Open Graph and Twitter metadata.
4. Add JSON-LD:
   - Product pages: `Product` with price, availability, image.
   - News pages: `Article`.
5. Implement `sitemap` and `robots` routes.
6. Maintain unique titles and descriptions.
7. Exclude non-public pages from indexing.
8. Validate with Search Console and rich-results checks during release testing.

## 4) TanStack Table and Recharts usage

## Decision

1. Use TanStack Table as the standard for admin data grids.
2. Use Recharts for admin analytics visualizations where charts add decision value.

## Where to apply

1. TanStack Table:
   - Products list
   - Orders list
   - Users/roles list
   - Admin error/state tables
2. Recharts:
   - Sales over time
   - Order status distribution
   - Top products by revenue/units

## Implementation constraints

1. Keep chart rendering client-side only where required.
2. Pre-aggregate chart data on server endpoints to reduce client compute.
3. Add fallback empty/error states for all chart/table panels.

## 5) Recommended baseline standards

1. Validation-first boundaries with Zod.
2. Server-first rendering for storefront SEO pages.
3. React Query only where interaction complexity requires it.
4. Zustand only for client state boundaries, not server truth.
5. Structured-data and metadata coverage tested in CI.
6. Unit tests required per deliverable plus E2E on critical commerce flows.

## Source links

1. Next.js data fetching and server/client patterns: https://nextjs.org/docs/app/getting-started/fetching-data
2. Next.js single-page app guide and React Query integration notes: https://nextjs.org/docs/app/guides/single-page-applications
3. Next.js metadata API: https://nextjs.org/docs/app/getting-started/metadata-and-og-images
4. Next.js JSON-LD guide: https://nextjs.org/docs/app/guides/json-ld
5. Next.js sitemap API: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
6. Next.js robots API: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
7. Google Search Central SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
8. Google Product structured data guidance: https://developers.google.com/search/docs/appearance/structured-data/product-snippet
9. TanStack Query docs: https://tanstack.com/query/latest/docs/framework/react/overview
10. TanStack Table docs: https://tanstack.com/table/latest/docs/guide/column-defs
11. Zod docs: https://zod.dev/
12. Recharts npm package: https://www.npmjs.com/package/recharts
