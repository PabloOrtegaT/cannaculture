# Domain Model and Validation Flow

## Problem solved

Different store verticals (3D prints, PC parts, plant seeds) need one reusable data model with strong validation and permission boundaries, without changing schema for each store type.

## User roles and actors

- Owner: full control, including role management.
- Manager: operational control for catalog/content/orders.
- Catalog: catalog and inventory maintenance only.
- API layer: receives create/update payloads and validates them before persistence.

## How to use

1. Use `@base-ecommerce/domain` for core schemas, typed attribute validation, RBAC checks, and invariants.
2. Use `@base-ecommerce/validation` for create/update API DTO schemas.
3. Validate product/category attribute payloads with `validateCategoryAttributeValues(templateKey, values)`.
4. Enforce permissions using `canRolePerform(role, permission)`.
5. Validate inventory and price invariants before write operations.
6. Resolve active store profile with `resolveStoreProfile(process.env.STORE_PROFILE)` and keep runtime data profile-scoped.

## How it works

- Domain schemas define entities for:
  - categories
  - products
  - variants
  - inventory ledger entries
  - home content entities (news, promo banner, featured sale)
- Category templates provide typed attributes per vertical.
- Store profile contract enforces one active profile (`prints-3d`, `pc-components`, or `plant-seeds`) at runtime.
- Attribute validation dynamically builds a strict schema from category definitions.
- API DTO schemas provide create/update payload contracts for each aggregate.
- RBAC matrix maps role to allowed permissions.
- Invariant helpers enforce pricing and stock consistency rules.

## Why this approach

- Keeps business rules centralized and reusable.
- Enables vertical flexibility with typed dynamic attributes.
- Prevents malformed payloads from entering persistence layer.
- Gives clear authorization boundaries early in the project lifecycle.

## Alternatives considered

- Fully free-form JSON attributes:
  - More flexible but weak validation and harder querying/reporting.
- Separate schema per business vertical:
  - Strongly typed but high maintenance and poor reuse.

## Data contracts or schemas involved

- Domain entity schemas:
  - `categorySchema`
  - `productSchema`
  - `productVariantSchema`
  - `inventoryLedgerEntrySchema`
  - `newsPostSchema`
  - `promoBannerSchema`
  - `featuredSaleSchema`
- Store profile contract:
  - `storeProfileSchema`
  - `resolveStoreProfile(input)`
  - `defaultStoreProfile`
- API DTO schemas:
  - create/update category, product, variant, inventory entry
  - create/update news, promo banner, featured sale
  - create/update role assignment

## Failure modes and edge cases

- Attribute payload includes unknown keys (rejected by strict schema).
- Enum attribute receives unsupported value.
- Compare-at price lower than or equal to base price.
- Inventory ledger history producing negative running stock.
- Unauthorized role attempting restricted action.
- Invalid `STORE_PROFILE` value (must fail fast).
- Runtime catalog/content loaded from mixed vertical data (blocked by profile scoping).

## Observability and debugging

- Schema-safeParse errors provide actionable field-level issues.
- Invariant errors identify the failing business rule directly.
- Permission checks are deterministic and test-backed for each role/action.

## Security considerations

- DTO validation protects API boundaries from malformed payloads.
- RBAC prevents privilege escalation by non-owner roles.
- Strict attribute parsing blocks unexpected fields.

## Tests that validate this flow

- Attribute validation tests:
  - valid and invalid category payloads
  - unknown attribute rejection
- RBAC tests:
  - owner all permissions
  - manager restrictions
  - catalog restrictions
- Store profile tests:
  - default profile fallback
  - valid profile acceptance
  - invalid profile rejection
- Invariant tests:
  - compare-at price constraint
  - inventory running stock non-negative enforcement

## Open questions or future improvements

- Add per-category custom validation hooks (cross-field constraints).
- Extend RBAC to action scopes (per category/store section).
- Add schema versioning strategy for long-lived forks.
