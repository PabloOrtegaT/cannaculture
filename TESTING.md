# Testing Guide

## Test stack

- Unit and component tests: Vitest + React Testing Library
- End-to-end scaffolding: Playwright

## Commands

```bash
npm run test
```

Runs workspace unit/component tests.

```bash
npm run test:e2e
```

Runs Playwright end-to-end tests (requires browser installation with `npx playwright install` when needed).

## Coverage target (foundation baseline)

- Ensure schema validation and one shared UI component are covered by unit/component tests.
- Expand coverage requirements in subsequent deliverables.
