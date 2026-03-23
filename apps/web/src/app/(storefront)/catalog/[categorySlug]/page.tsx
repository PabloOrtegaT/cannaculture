import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { ProductCard } from "@/components/storefront/product-card";
import { getCategoryBySlug, listCatalogProducts, type ProductSort } from "@/server/data/storefront-service";
import { createPageMetadata } from "@/server/seo/metadata";
import { buildBreadcrumbJsonLd } from "@/server/seo/structured-data";

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
    title: `${category.name} | Catalog`,
    description: category.description ?? `Browse ${category.name} products.`,
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

  return (
    <main className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{category.name}</h1>
        {category.description && <p className="text-sm text-muted-foreground">{category.description}</p>}
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
          <select name="sort" defaultValue={sort} className="rounded-md border bg-background px-3 py-2 text-sm">
            <option value="featured">Featured</option>
            <option value="name-asc">Name A-Z</option>
            <option value="price-asc">Price low to high</option>
            <option value="price-desc">Price high to low</option>
          </select>
          <button type="submit" className="hidden" />
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {products.map((entry) => (
          <ProductCard
            key={entry.product.id}
            name={entry.product.name}
            categorySlug={category.slug}
            productSlug={entry.product.slug}
            currency={entry.product.currency}
            minPriceCents={entry.minVariantPriceCents}
            compareAtPriceCents={entry.product.compareAtPriceCents}
            hasStock={entry.hasStock}
          />
        ))}
      </section>

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
