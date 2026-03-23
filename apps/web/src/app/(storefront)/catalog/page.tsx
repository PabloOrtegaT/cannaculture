import type { Metadata } from "next";
import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/storefront/product-card";
import { listCatalogProducts, listCategories, type ProductSort } from "@/server/data/storefront-service";
import { createPageMetadata } from "@/server/seo/metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = createPageMetadata({
  title: "Catalog",
  description: "Browse products with filters and sorting.",
  pathname: "/catalog",
});

export const revalidate = 60;

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

const sortLabels: Record<ProductSort, string> = {
  featured: "Featured",
  "name-asc": "Name A–Z",
  "price-asc": "Price: Low → High",
  "price-desc": "Price: High → Low",
};

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
    <div className="space-y-8">
      {/* ── Page header ────────────────────────────────────── */}
      <div className="border-b pb-5">
        <p className="text-xs font-medium uppercase tracking-widest text-primary mb-1">
          Shop
        </p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-4xl font-bold tracking-tight">Catalog</h1>
          <p className="text-sm text-muted-foreground">
            {products.length} {products.length === 1 ? "product" : "products"}
            {query && (
              <span className="ml-1 italic">for &ldquo;{query}&rdquo;</span>
            )}
          </p>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Search + sort row */}
        <form className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search products…"
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
            <select
              name="sort"
              defaultValue={sort}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {allowedSorts.map((s) => (
                <option key={s} value={s}>{sortLabels[s]}</option>
              ))}
            </select>
          </div>
          {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
          <Button type="submit" variant="default">
            Apply
          </Button>
        </form>

        {/* Category filter — minimal pill outline style */}
        <div className="flex flex-wrap gap-2">
          <Link
            href="/catalog"
            className={cn(
              "rounded-full border px-3.5 py-1 text-xs font-medium transition-colors",
              !categorySlug
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
            )}
          >
            All
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/catalog?category=${category.slug}`}
              className={cn(
                "rounded-full border px-3.5 py-1 text-xs font-medium transition-colors",
                categorySlug === category.slug
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
              )}
            >
              {category.name}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Product grid ───────────────────────────────────── */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center gap-3">
          <p className="text-muted-foreground font-medium">No products found.</p>
          <Button asChild variant="link" size="sm">
            <Link href="/catalog">Clear filters</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((entry) => {
            if (!entry.category) {
              return null;
            }
            return (
              <ProductCard
                key={entry.product.id}
                name={entry.product.name}
                categorySlug={entry.category.slug}
                productSlug={entry.product.slug}
                currency={entry.product.currency}
                minPriceCents={entry.minVariantPriceCents}
                compareAtPriceCents={entry.product.compareAtPriceCents}
                hasStock={entry.hasStock}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
