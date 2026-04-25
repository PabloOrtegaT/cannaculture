import type { MetadataRoute } from "next";
import { listCatalogProducts, listCategories } from "@/server/data/storefront-service";
import { buildCanonicalUrl } from "@/server/seo/metadata";

export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    {
      url: buildCanonicalUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: buildCanonicalUrl("/catalog"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  const categories = listCategories();
  for (const category of categories) {
    entries.push({
      url: buildCanonicalUrl(`/catalog/${category.slug}`),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    });
  }

  const products = listCatalogProducts();
  for (const productEntry of products) {
    const category = productEntry.category;
    if (!category) {
      continue;
    }
    entries.push({
      url: buildCanonicalUrl(`/catalog/${category.slug}/${productEntry.product.slug}`),
      lastModified: new Date(productEntry.product.updatedAt),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  return entries;
}
