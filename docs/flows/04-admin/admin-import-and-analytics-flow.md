# Admin Import and Analytics Flow

## Problem solved

Admin teams need a fast bulk-import path for catalog updates and dashboard analytics panels for operational visibility.

## User roles and actors

- Owner/Manager/Catalog for import (catalog write permission).
- Owner/Manager for dashboard analytics visibility.
- Admin service and CSV parser modules.

## How to use

1. Open `/admin/import`.
2. Paste CSV with headers:
   - `name,slug,baseSku,categorySlug,status,currency,priceCents,stockOnHand`
3. Run import and review:
   - imported product/variant counts
   - row-level validation errors table
4. Open `/admin` dashboard to review:
   - sales trend line chart
   - top products bar chart
   - order status pie chart
   - orders data table

## How it works

- CSV parser (`server/admin/csv-import.ts`) validates:
  - headers
  - row shape/types
  - numeric fields
- Import service applies rows to active profile store and supports partial success.
- Errors are collected with row numbers and raw row values for debugging.
- Analytics data is pre-aggregated server-side from order snapshots.
- Recharts renders chart panels client-side.
- TanStack Table renders row-level CSV errors and orders table.

## Why this approach

- Keeps import deterministic and testable.
- Allows admins to resolve bad rows without blocking valid rows.
- Keeps charts lightweight by server pre-aggregation.

## Alternatives considered

- Reject whole CSV on first invalid row:
  - Easier implementation but poor operational UX.
- Client-side analytics aggregation:
  - More client compute and inconsistent results.

## Data contracts or schemas involved

- CSV expected header contract (`productCsvHeaders`).
- Parsed row schema in CSV parser.
- Runtime store product/variant schemas.
- Analytics view models:
  - sales trend points
  - top product points
  - order status distribution

## Failure modes and edge cases

- Invalid/missing headers.
- Row with malformed numbers or enum values.
- Unknown category slug for active profile.
- Duplicate product slug or base SKU in current profile.
- Empty order dataset (charts/tables must still render).

## Observability and debugging

- Import summary reports success counts and row error counts.
- Row-level error table includes detailed reason and source values.
- Dashboard tables/charts expose operational data snapshots.

## Security considerations

- Import action requires `catalog:write`.
- Dashboard routes are role-guarded.

## Tests that validate this flow

- `src/__tests__/admin/csv-import.test.ts`
- `e2e/admin-csv-import.spec.ts`
- `src/__tests__/admin/table-columns.test.tsx` (orders/csv table column behavior)

## Open questions or future improvements

- Add file-upload endpoint with streaming parser.
- Add import dry-run mode before mutation.
- Connect analytics to persisted orders and date-range filtering.
