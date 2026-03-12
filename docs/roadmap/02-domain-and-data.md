# Deliverable 02: Domain and Data Model

## Objective

Implement a reusable ecommerce domain model supporting the three planned verticals.

## Scope

- Catalog entities.
- Variant and inventory model.
- Typed dynamic attributes per category.
- Home content entities (news, promo banner, featured sales).
- Admin RBAC baseline.
- Store profile isolation model (single active vertical per fork).

## Implementation checklist

- Create product, variant, inventory, category, attribute, and content schemas.
- Add Zod DTO validation for all create/update API inputs.
- Define role model:
  - Owner
  - Manager
  - Catalog
- Add profile-scoped seed fixtures for:
  - 3D print attributes
  - PC component attributes
  - Plant seed attributes
- Add store profile config contract (for example `STORE_PROFILE`) and enforce single-profile data loading.
- Create domain flow docs in `docs/flows/02-domain-data/` for schema and validation behavior.

## Unit test requirements

- Attribute validation engine (valid and invalid category payloads).
- Permission checks for each role and action.
- Price and stock invariant tests.

## Acceptance criteria

- Data model supports all three business types without schema changes.
- API input validation rejects malformed payloads.
- Role checks prevent unauthorized writes.
- Profile isolation prevents cross-vertical catalog mixing in a single fork runtime.
- Domain flow docs exist for product model, attribute validation, and RBAC behavior.

## Exit artifacts

- `docs/erd/domain-model.md`.
- Zod schemas and shared type exports.
- Unit test suite for core domain rules.
- `docs/flows/02-domain-data/domain-model-and-validation-flow.md`.
