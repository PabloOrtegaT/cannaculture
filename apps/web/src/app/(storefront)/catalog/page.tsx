import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/storefront/product-card";
import { listCatalogProducts, listCategories, type ProductSort } from "@/server/data/storefront-service";

export const metadata: Metadata = {
  title: "Catalog | Base Ecommerce",
  description: "Browse products with filters and sorting.",
};

type CatalogPageProps = {
  searchParams?: Promise<{
    q?: string;
    sort?: string;
    category?: string;
  }>;
};

const allowedSorts: ProductSort[] = ["featured", "name-asc", "price-asc", "price-desc"];

function normalizeSort(sort?: string): ProductSort {
  if (!sort) {
    return "featured";
  }
  return allowedSorts.includes(sort as ProductSort) ? (sort as ProductSort) : "featured";
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const sort = normalizeSort(resolvedSearchParams?.sort);
  const query = resolvedSearchParams?.q ?? "";
  const categorySlug = resolvedSearchParams?.category;

  const categories = listCategories();
  const products = listCatalogProducts({
    query,
    sort,
    ...(categorySlug ? { categorySlug } : {}),
  });

  return (
    <main className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Catalog</h1>
        <p className="text-sm text-muted-foreground">
          Browse and filter products by category, keyword, and sort order.
        </p>
      </header>

      <section className="space-y-3 rounded-lg border bg-card p-4 text-card-foreground">
        <form className="grid gap-3 md:grid-cols-[1fr_200px]">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search products"
            className="rounded-md border bg-background px-3 py-2 text-sm"
          />
          <select name="sort" defaultValue={sort} className="rounded-md border bg-background px-3 py-2 text-sm">
            <option value="featured">Featured</option>
            <option value="name-asc">Name A-Z</option>
            <option value="price-asc">Price low to high</option>
            <option value="price-desc">Price high to low</option>
          </select>
          {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
          <button type="submit" className="hidden" />
        </form>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/catalog"
            className={`rounded-md border px-3 py-1 text-sm ${
              !categorySlug ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
          >
            All
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/catalog/${category.slug}`}
              className={`rounded-md border px-3 py-1 text-sm ${
                categorySlug === category.slug ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              {category.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {products.map((entry) => {
          if (!entry.category) {
            return null;
          }

          return (
            <ProductCard
              key={entry.product.id}
              name={entry.product.name}
              description={entry.product.description}
              categorySlug={entry.category.slug}
              productSlug={entry.product.slug}
              currency={entry.product.currency}
              minPriceCents={entry.minVariantPriceCents}
              compareAtPriceCents={entry.product.compareAtPriceCents}
              hasStock={entry.hasStock}
            />
          );
        })}
      </section>
    </main>
  );
}
