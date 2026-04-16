import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { ProductCard } from "@/components/storefront/product-card";
import {
  getCategoryBySlug,
  listCatalogProducts,
  listCategories,
  type ProductSort,
} from "@/server/data/storefront-service";
import { createPageMetadata, SEO_BRAND_NAME } from "@/server/seo/metadata";
import { buildBreadcrumbJsonLd } from "@/server/seo/structured-data";
import { getRelatedCategoryLinks } from "@/features/catalog/related-links";
import { CategoryBuyingGuide } from "@/features/catalog/category-buying-guide";

type CategoryPageProps = {
  params: Promise<{
    categorySlug: string;
  }>;
  searchParams?: Promise<{
    q?: string;
    sort?: string;
  }>;
};

const allowedSorts: ProductSort[] = ["featured", "name-asc", "price-asc", "price-desc"];

function normalizeSort(sort?: string): ProductSort {
  if (!sort) {
    return "featured";
  }
  return allowedSorts.includes(sort as ProductSort) ? (sort as ProductSort) : "featured";
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const category = getCategoryBySlug(resolvedParams.categorySlug);
  if (!category) {
    return {
      title: "Category not found",
    };
  }

  return createPageMetadata({
    title: `${category.name} para cultivo indoor | ${SEO_BRAND_NAME}`,
    description:
      category.description ??
      `Compra ${category.name.toLowerCase()} para cultivo indoor en ${SEO_BRAND_NAME}.`,
    pathname: `/catalog/${category.slug}`,
  });
}

export const revalidate = 60;

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const category = getCategoryBySlug(resolvedParams.categorySlug);
  if (!category) {
    notFound();
  }

  const sort = normalizeSort(resolvedSearchParams?.sort);
  const products = listCatalogProducts({
    categorySlug: category.slug,
    query: resolvedSearchParams?.q ?? "",
    sort,
  });
  const relatedCategories = getRelatedCategoryLinks({
    categories: listCategories().map((entry) => ({
      id: entry.id,
      name: entry.name,
      slug: entry.slug,
      templateKey: entry.templateKey,
    })),
    currentCategoryId: category.id,
    currentTemplateKey: category.templateKey,
    limit: 6,
  });

  return (
    <main className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{category.name}</h1>
        {category.description && (
          <p className="text-sm text-muted-foreground">{category.description}</p>
        )}
      </header>

      <section className="rounded-lg border bg-card p-4 text-card-foreground">
        <form className="grid gap-3 md:grid-cols-[1fr_220px]">
          <input
            type="text"
            name="q"
            defaultValue={resolvedSearchParams?.q ?? ""}
            placeholder={`Search in ${category.name}`}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          />
          <select
            name="sort"
            defaultValue={sort}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="featured">Featured</option>
            <option value="name-asc">Name A-Z</option>
            <option value="price-asc">Price low to high</option>
            <option value="price-desc">Price high to low</option>
          </select>
          <button type="submit" className="hidden" />
        </form>
      </section>

      <CategoryBuyingGuide categorySlug={category.slug} />

      <section className="grid gap-4 md:grid-cols-2">
        {products.map((entry) => (
          <ProductCard
            key={entry.product.id}
            name={entry.product.name}
            categorySlug={category.slug}
            categoryName={category.name}
            productSlug={entry.product.slug}
            currency={entry.product.currency}
            minPriceCents={entry.minVariantPriceCents}
            compareAtPriceCents={entry.product.compareAtPriceCents}
            hasStock={entry.hasStock}
            templateKey={category.templateKey}
            attributeValues={entry.variants[0]?.attributeValues ?? {}}
          />
        ))}
      </section>

      {relatedCategories.length > 0 && (
        <section className="space-y-2 rounded-lg border bg-card p-4 text-card-foreground">
          <h2 className="text-sm font-semibold">Explora también</h2>
          <div className="flex flex-wrap gap-2">
            {relatedCategories.map((entry) => (
              <Link
                key={entry.id}
                href={`/catalog/${entry.slug}`}
                className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {entry.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <JsonLdScript
        value={buildBreadcrumbJsonLd([
          { name: "Home", pathname: "/" },
          { name: "Catalog", pathname: "/catalog" },
          { name: category.name, pathname: `/catalog/${category.slug}` },
        ])}
      />
    </main>
  );
}
