# Foundation Scaffold Flow

## Problem solved

Starting from an empty repository is slow and error-prone when every new store fork needs the same baseline architecture, quality checks, and testing setup.

## User roles and actors

- Platform engineer: implements and maintains the base architecture.
- Feature engineer: builds future deliverables on top of this foundation.
- CI runner: validates linting, type safety, tests, and build output.

## How to use

1. Install dependencies with `npm install` at repository root.
2. Start development server with `npm run dev`.
3. Run quality checks:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test`
4. Access storefront placeholder at `/`.
5. Access admin placeholder at `/admin`.

## How it works

- The repository uses npm workspaces with:
  - `apps/web`: Next.js application.
  - `packages/ui`: shared shadcn-style UI package.
  - `packages/validation`: shared Zod validation package.
- Next.js transpiles workspace packages via `transpilePackages`.
- Strict TypeScript behavior is centralized in `tsconfig.base.json`.
- Vitest + RTL test schema validation and shared UI rendering.
- Playwright config is scaffolded for e2e execution in upcoming deliverables.

## Why this approach

- Workspaces provide clear boundaries while keeping development fast in a single repository.
- Shared UI/validation packages prevent duplication across storefront and admin modules.
- Strict type settings reduce runtime bugs early.
- CI quality gates enforce consistent standards before merge.

## Alternatives considered

- Single app-only structure without internal packages:
  - Faster initial setup but weaker boundaries and harder reuse across forks.
- Multiple independent repositories:
  - Higher coordination overhead and duplicated tooling effort.

## Data contracts or schemas involved

- `productInputSchema` from `@base-ecommerce/validation` defines baseline product payload validation.
- `Button` API from `@base-ecommerce/ui` defines shared component contract for UI usage.

## Failure modes and edge cases

- Missing workspace install causes unresolved package imports.
- Invalid product payloads are rejected by Zod schema parsing.
- CI fails if lint/typecheck/tests/build are broken in any workspace.

## Observability and debugging

- Unit test output and coverage reports from Vitest identify schema/UI regressions.
- CI workflow logs indicate which quality gate failed.
- Local Next.js runtime errors surface route or import issues quickly.

## Security considerations

- No sensitive credentials are required for this deliverable.
- Strict input validation baseline reduces unsafe payload handling in future API routes.

## Tests that validate this flow

- Zod schema tests:
  - accepts valid payload
  - rejects invalid compare-at price relation
- UI component test:
  - renders shared button component and expected default styling

## Open questions or future improvements

- Add repository-wide formatting enforcement in pre-commit hooks.
- Add smoke e2e execution into CI once browser install/runtime budget is finalized.
- Introduce architecture decision records (ADRs) for major stack changes.
