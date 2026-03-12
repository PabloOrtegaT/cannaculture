# Deliverable 01: Foundation

## Objective

Create a production-ready base skeleton with core tooling, conventions, and quality gates.

## Scope

- Initialize Next.js + TypeScript project structure.
- Add shadcn/ui baseline and design tokens.
- Define monorepo-ready internal package boundaries (even if single app at start).
- Set linting, formatting, and CI checks.
- Configure test runner baseline.

## Implementation checklist

- Create app structure for `storefront` and `admin` route groups.
- Add shared UI component folder and theme tokens.
- Configure strict TypeScript settings.
- Add `zod` and define a first shared validation module.
- Add testing stack:
  - Vitest for unit tests.
  - React Testing Library for component tests.
  - Playwright scaffold for end-to-end tests.
- Create foundational flow docs in `docs/flows/01-foundation/` using the standard template.

## Unit test requirements

- Validate a sample Zod schema for success and failure paths.
- Render one shared UI component with RTL test.

## Acceptance criteria

- Project builds successfully.
- Unit tests pass in CI mode.
- Lint/typecheck/test scripts exist and run cleanly.
- Foundation flow docs are present and explain setup architecture decisions.

## Exit artifacts

- Base code scaffold.
- CI config with quality gates.
- Initial `TESTING.md` guide.
- `docs/flows/01-foundation/foundation-scaffold-flow.md`.
