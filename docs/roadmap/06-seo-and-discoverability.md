# Deliverable 06: SEO and Discoverability

## Objective

Build technical SEO directly into the platform for better indexing and eligibility for rich results.

## Scope

- Page metadata strategy.
- Canonical URL strategy.
- Open Graph and social metadata.
- JSON-LD structured data for products and articles/news.
- Robots and sitemap generation.
- Search Console readiness and validation workflow.

## Implementation checklist

- Implement `metadata` or `generateMetadata` for:
  - Home
  - Category pages
  - Product pages
  - News pages
- Add canonical URLs for all indexable pages.
- Implement JSON-LD components:
  - `Product`
  - `Article` (for news)
  - `BreadcrumbList` where applicable
- Add dynamic sitemap and robots handlers.
- Add internal SEO quality rules:
  - Unique title and description per page.
  - Noindex for admin/auth/private pages.
  - Product pages must include price, availability, and image metadata.
- Create SEO flow docs in `docs/flows/06-seo/` for metadata generation, structured data, and indexing controls.

## Unit test requirements

- Metadata builder tests for title/description/canonical.
- JSON-LD schema output tests for product and article.
- Robots and sitemap generation tests.

## Integration/e2e requirements

- E2E crawl snapshot for key public routes.
- Validate structured data output in rendered HTML.

## Acceptance criteria

- All indexable pages have complete metadata.
- Sitemaps and robots are valid.
- Product pages satisfy structured-data requirements for rich results eligibility.
- SEO flow docs exist and explain implementation rationale and validation process.

## Exit artifacts

- SEO utility layer.
- Structured-data components.
- Technical SEO checklist and validation report.
- `docs/flows/06-seo/` flow documents.
