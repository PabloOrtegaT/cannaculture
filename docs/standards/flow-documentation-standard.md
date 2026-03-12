# Flow Documentation Standard

## Purpose

Every important implementation must include documentation that a human can read quickly to understand:

1. What this flow does.
2. What problem it solves.
3. How to use it.
4. How it works internally.
5. Why this design was selected.

This documentation is mandatory for each deliverable.

## Definition of done

A feature is not done unless its flow documentation exists and is updated.

## Where to place docs

Create flow docs under:

`docs/flows/<deliverable-id>/`

Examples:

- `docs/flows/03-storefront/home-news-flow.md`
- `docs/flows/04-admin/product-crud-flow.md`
- `docs/flows/05-payments/card-checkout-flow.md`

## Required sections

Each flow document must include these sections:

1. **Flow name**
2. **Problem solved**
3. **User roles and actors**
4. **How to use (step-by-step)**
5. **How it works (technical)**
6. **Why this approach**
7. **Alternatives considered**
8. **Data contracts or schemas involved**
9. **Failure modes and edge cases**
10. **Observability and debugging**
11. **Security considerations**
12. **Tests that validate this flow**
13. **Open questions or future improvements**

## Quality bar

- Use plain language first, technical depth second.
- Include concrete examples (payloads, route names, UI actions).
- Avoid undocumented implicit behavior.
- Keep docs synchronized with code changes in the same PR/commit.

## Template

```md
# <Flow Name>

## Problem solved

## User roles and actors

## How to use

## How it works

## Why this approach

## Alternatives considered

## Data contracts or schemas involved

## Failure modes and edge cases

## Observability and debugging

## Security considerations

## Tests that validate this flow

## Open questions or future improvements
```
