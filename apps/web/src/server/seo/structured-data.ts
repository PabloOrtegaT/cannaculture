import { buildCanonicalUrl, getSiteBaseUrl, SEO_BRAND_NAME } from "./metadata";

type BreadcrumbItem = {
  name: string;
  pathname: string;
};

type ProductStructuredDataInput = {
  name: string;
  description: string;
  pathname: string;
  currency: "MXN" | "USD";
  priceCents: number;
  stockOnHand: number;
  sku?: string | undefined;
};

type ArticleStructuredDataInput = {
  headline: string;
  description: string;
  pathname: string;
};

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: buildCanonicalUrl(item.pathname),
    })),
  };
}

export function buildProductJsonLd(input: ProductStructuredDataInput) {
  const canonicalUrl = buildCanonicalUrl(input.pathname);
  const imageUrl = new URL("/favicon.ico", getSiteBaseUrl()).toString();

  const offer: Record<string, unknown> = {
    "@type": "Offer",
    url: canonicalUrl,
    priceCurrency: input.currency,
    price: (input.priceCents / 100).toFixed(2),
    availability:
      input.stockOnHand > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    itemCondition: "https://schema.org/NewCondition",
  };

  const product: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    image: [imageUrl],
    brand: {
      "@type": "Brand",
      name: SEO_BRAND_NAME,
    },
    offers: offer,
  };

  if (input.sku) {
    product.sku = input.sku;
    offer.sku = input.sku;
  }

  return product;
}

export function buildArticleJsonLd(input: ArticleStructuredDataInput) {
  const canonicalUrl = buildCanonicalUrl(input.pathname);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.headline,
    description: input.description,
    url: canonicalUrl,
    author: {
      "@type": "Organization",
      name: SEO_BRAND_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SEO_BRAND_NAME,
    },
  };
}
