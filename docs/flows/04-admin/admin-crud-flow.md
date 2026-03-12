# Admin CRUD Flow

## Problem solved

Operations teams need one admin surface to manage profile-scoped catalog and home content without mixing vertical data.

## User roles and actors

- Owner/Manager/Catalog roles (permission dependent).
- Admin operators performing product, variant, category, and content operations.
- Storefront server readers consuming same runtime state.

## How to use

1. Open `/admin/products`:
   - Create categories.
   - Create/edit products.
   - Create/edit variants.
   - Review TanStack tables for products/variants.
2. Open `/admin/content`:
   - Create news posts, banners, featured-sale blocks.
   - Toggle active/status states.
   - Review content entries table.
3. Navigate storefront `/` and `/catalog` to verify updates are reflected.

## How it works

- Admin pages call server actions under `app/(admin)/admin/actions.ts`.
- Actions validate permissions and pass payloads to `server/admin/admin-service.ts`.
- Service validates with Zod DTO/domain schemas, mutates in-memory profile store, and timestamps updates.
- Storefront services read from same profile runtime store (`runtime-store.ts`) so admin changes are immediately visible.
- TanStack Table is used for products, variants, and content entry tables.

## Why this approach

- Enables full admin behavior before persistence layer integration.
- Keeps business validation at service/schema boundary.
- Preserves profile isolation rules while allowing rich admin workflows.

## Alternatives considered

- Direct database integration in Deliverable 04:
  - More durable but adds migration/infra complexity too early.
- Client-only local state forms:
  - Faster prototype, but cannot reflect changes to storefront services.

## Data contracts or schemas involved

- Domain schemas:
  - `categorySchema`, `productSchema`, `productVariantSchema`
  - `newsPostSchema`, `promoBannerSchema`, `featuredSaleSchema`
- Validation DTOs:
  - create/update product, variant, category, and content inputs.
- Profile resolution:
  - `STORE_PROFILE` + runtime store scoping.

## Failure modes and edge cases

- Unknown category/product/variant ids on updates.
- Invalid compare-at/price combinations.
- Invalid news/banner/featured payload shape.
- Cross-profile category slug mismatch avoided by profile store scoping.

## Observability and debugging

- Service-layer errors are explicit (not found, permission, validation).
- Table views expose latest state immediately after action revalidation.

## Security considerations

- All mutations enforce route-specific permissions.
- No client-trusted writes without server action guard.

## Tests that validate this flow

- `src/__tests__/admin/table-columns.test.tsx` (table behavior)
- `e2e/admin-product-crud.spec.ts` (create/edit product integration path)

## Open questions or future improvements

- Persist state in database with transactional writes.
- Add optimistic UI and inline edit for table cells.
- Add granular field-level change audit trail.
