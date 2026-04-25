import type { Metadata } from "next";
import Link from "next/link";
import { Search, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/storefront/product-card";
import { MobileFilterToggle } from "@/components/storefront/mobile-filter-toggle";
import {
  listCatalogProducts,
  listCategories,
  type ProductSort,
} from "@/server/data/storefront-service";
import { createPageMetadata, SEO_BRAND_NAME } from "@/server/seo/metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = createPageMetadata({
  title: `Indoor Growing Catalog | ${SEO_BRAND_NAME}`,
  description:
    "Browse seeds, grow lights, substrates and accessories for indoor growing with Cannaculture.",
  pathname: "/catalog",
});

export const revalidate = 60;

type CatalogPageProps = {
  searchParams?: Promise<{
    q?: string;
    sort?: string;
    category?: string;
    priceMin?: string;
    priceMax?: string;
  }>;
};

const allowedSorts: ProductSort[] = ["featured", "name-asc", "price-asc", "price-desc"];

function normalizeSort(sort?: string): ProductSort {
  if (!sort) return "featured";
  return allowedSorts.includes(sort as ProductSort) ? (sort as ProductSort) : "featured";
}

const sortLabels: Record<ProductSort, string> = {
  featured: "Featured",
  "name-asc": "Name A-Z",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
};

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const resolved = searchParams ? await searchParams : undefined;
  const sort = normalizeSort(resolved?.sort);
  const query = resolved?.q ?? "";
  const categorySlug = resolved?.category;
  const priceMin = resolved?.priceMin ? Number(resolved.priceMin) : undefined;
  const priceMax = resolved?.priceMax ? Number(resolved.priceMax) : undefined;

  const categories = listCategories();
  const products = listCatalogProducts({
    query,
    sort,
    ...(categorySlug ? { categorySlug } : {}),
    ...(priceMin !== undefined && !Number.isNaN(priceMin) ? { priceMin } : {}),
    ...(priceMax !== undefined && !Number.isNaN(priceMax) ? { priceMax } : {}),
  });

  const filterForm = (
    <>
      {/* Price range */}
      <div className="mb-5">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Price, $
        </p>
        <div className="flex gap-2">
          <input
            type="number"
            name="priceMin"
            defaultValue={resolved?.priceMin ?? ""}
            placeholder="Min"
            min={0}
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <input
            type="number"
            name="priceMax"
            defaultValue={resolved?.priceMax ?? ""}
            placeholder="Max"
            min={0}
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>

      {/* Category */}
      <div className="mb-5">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Category
        </p>
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="category"
              value=""
              defaultChecked={!categorySlug}
              className="h-3.5 w-3.5 accent-emerald-600"
            />
            <span
              className={cn(
                "text-xs",
                !categorySlug ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              All products
            </span>
          </label>
          {categories.map((cat) => (
            <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="category"
                value={cat.slug}
                defaultChecked={categorySlug === cat.slug}
                className="h-3.5 w-3.5 accent-emerald-600"
              />
              <span
                className={cn(
                  "text-xs",
                  categorySlug === cat.slug
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {cat.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div className="mb-5">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Sort by
        </p>
        <div className="flex flex-col gap-1.5">
          {allowedSorts.map((s) => (
            <label key={s} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="sort"
                value={s}
                defaultChecked={sort === s}
                className="h-3.5 w-3.5 accent-emerald-600"
              />
              <span
                className={cn(
                  "text-xs",
                  sort === s ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {sortLabels[s]}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Hidden search param passthrough */}
      {query && <input type="hidden" name="q" value={query} />}

      <Button type="submit" size="sm" className="w-full">
        Apply filters
      </Button>
    </>
  );

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b pb-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-1">
            Shop
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Catalog</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Found <strong className="text-foreground">{products.length}</strong>{" "}
            {products.length === 1 ? "product" : "products"}
            {query && <span className="italic"> for &ldquo;{query}&rdquo;</span>}
          </p>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <form method="GET" action="/catalog" className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search products..."
                className="h-9 w-52 rounded-md border border-input bg-background pl-8 pr-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
              {priceMin !== undefined && !Number.isNaN(priceMin) && (
                <input type="hidden" name="priceMin" value={priceMin} />
              )}
              {priceMax !== undefined && !Number.isNaN(priceMax) && (
                <input type="hidden" name="priceMax" value={priceMax} />
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Mobile filter toggle */}
      <form method="GET" action="/catalog">
        <MobileFilterToggle>{filterForm}</MobileFilterToggle>
      </form>

      {/* Body: sidebar + grid */}
      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="hidden md:block w-52 shrink-0 rounded-lg border bg-emerald-50/30 dark:bg-emerald-950/10 p-4">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b">
            <Sprout className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Filter your grow
            </span>
          </div>
          <form method="GET" action="/catalog" className="sticky top-24 space-y-0">
            {filterForm}
          </form>
        </aside>

        {/* Product grid */}
        <div className="flex-1 min-w-0">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center gap-3">
              <div className="rounded-full bg-emerald-50 dark:bg-emerald-950/30 p-4">
                <Sprout className="h-7 w-7 text-emerald-600" aria-hidden="true" />
              </div>
              <p className="font-medium">No products found</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your filters or search terms
              </p>
              <Button asChild variant="link" size="sm">
                <Link href="/catalog">Clear all filters</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((entry) => {
                if (!entry.category) return null;
                return (
                  <ProductCard
                    key={entry.product.id}
                    name={entry.product.name}
                    categorySlug={entry.category.slug}
                    categoryName={entry.category.name}
                    productSlug={entry.product.slug}
                    currency={entry.product.currency}
                    minPriceCents={entry.minVariantPriceCents}
                    compareAtPriceCents={entry.product.compareAtPriceCents}
                    hasStock={entry.hasStock}
                    templateKey={entry.category.templateKey}
                    attributeValues={entry.variants[0]?.attributeValues ?? {}}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
