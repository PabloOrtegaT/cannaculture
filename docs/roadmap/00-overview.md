# Roadmap Overview

## Goal

Build a reusable base ecommerce project (Next.js + TypeScript + shadcn/ui) that can be forked for:

- 3D prints
- PC components
- Plant seeds

The root `README.md` is only for project setup and local run instructions.
Detailed product and technical explanations live under `docs/`.

## Base-fork boundaries

- The base project supports multiple vertical schemas, but each fork must run a single active store profile (3D prints, PC components, or plant seeds).
- Runtime catalog/content data in a fork must be profile-scoped only. Cross-vertical mixed data is not allowed in production forks.
- Multi-vertical sample fixtures in the base repository are for development/reference only and must be split by profile.

## Core technology decisions

- Next.js App Router for server-first rendering and data fetching.
- Zod for schema validation at API boundaries and forms.
- TanStack Table for admin data tables.
- Recharts for dashboard analytics visualizations.
- Token-based theming with light/dark mode support as a reusable base capability.
- Unit tests as mandatory for each deliverable.
- End-to-end tests for critical storefront and admin flows.

## Delivery rules

1. Complete deliverables in order.
2. Each deliverable must pass its test plan.
3. Each deliverable must include human-readable flow docs in `docs/flows/`.
4. Flow docs must explain: what it does, problem solved, how to use, how it works, and why this design.
5. Keep documentation updated as implementation evolves.
6. No deliverable is considered done without unit tests.
7. No deliverable is considered done without required flow documentation.

## Documentation policy (mandatory)

Use `docs/standards/flow-documentation-standard.md` for all major flows.

Minimum per deliverable:

1. At least one flow document for each critical behavior implemented in that deliverable.
2. One update note in the deliverable document under `Exit artifacts` listing created flow docs.
3. Documentation changes must ship together with the code changes.

## Deliverable index

1. `01-foundation.md`
2. `02-domain-and-data.md`
3. `03-storefront-home-catalog.md`
4. `04-admin-dashboard.md`
5. `05-payments-and-orders.md`
6. `06-seo-and-discoverability.md`
7. `07-hardening-and-release.md`
