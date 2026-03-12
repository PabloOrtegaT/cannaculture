# Deliverable 07: Hardening and Release

## Objective

Prepare the base project for stable reuse and forking into domain-specific stores.

## Scope

- Security hardening.
- Performance hardening.
- Operational monitoring.
- Fork documentation.

## Implementation checklist

- Add rate limiting and basic abuse protection on critical endpoints.
- Add audit logging for admin sensitive actions.
- Add performance monitoring and error tracking.
- Document fork process:
  - Clone base.
  - Set single store profile config.
  - Seed category attributes.
  - Validate that only one profile dataset is active in runtime data.
  - Configure payment/media credentials.
  - Run test suite.
- Create release flow docs in `docs/flows/07-hardening-release/` for operations, incident handling, and fork process.

## Unit test requirements

- Security utility tests (token checks, permission edge cases).
- Config validation tests for fork-specific settings.
- Profile-isolation tests for fork configuration (single vertical active).

## Integration/e2e requirements

- Smoke tests for full customer journey.
- Smoke tests for admin operational flows.

## Acceptance criteria

- Fork setup can be completed with documented steps only.
- Fork profile isolation is validated and prevents mixed-vertical runtime catalog.
- Monitoring and logging cover critical failures.
- All quality gates pass on clean environment.
- Hardening and release flow docs exist for operational and handoff procedures.

## Exit artifacts

- Release checklist.
- Forking playbook.
- Baseline SLO/SLA and alerting thresholds.
- `docs/flows/07-hardening-release/` flow documents.
