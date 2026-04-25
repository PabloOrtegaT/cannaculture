import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Search, SlidersHorizontal, Sprout } from "lucide-react";
import { notFound } from "next/navigation";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { Button } from "@/components/ui/button";
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
    title: `${category.name} for Indoor Growing | ${SEO_BRAND_NAME}`,
    description:
      category.description ??
      `Shop ${category.name.toLowerCase()} for indoor growing at ${SEO_BRAND_NAME}.`,
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
      <header className="overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-50/70 via-background to-amber-50/40 dark:from-emerald-950/20 dark:via-background dark:to-amber-950/10">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_240px] md:p-8">
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Indoor growing category
            </p>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{category.name}</h1>
              {category.description && (
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                  {category.description}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                {products.length} {products.length === 1 ? "product" : "products"}
              </span>
              <span className="rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                Plant-focused buying guide below
              </span>
            </div>
          </div>

          <div className="rounded-xl border bg-card/80 p-4 backdrop-blur-sm">
            <p className="text-xs font-semibold text-foreground">Good for growers who need:</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Sprout className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                Clear product comparisons for indoor setups
              </li>
              <li className="flex items-start gap-2">
                <Sprout className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                Faster decisions on the right product type
              </li>
              <li className="flex items-start gap-2">
                <Sprout className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                Practical guidance before adding to cart
              </li>
            </ul>
          </div>
        </div>
      </header>

      <section className="rounded-xl border bg-card p-4 text-card-foreground md:p-5">
        <form className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              name="q"
              defaultValue={resolvedSearchParams?.q ?? ""}
              placeholder={`Search in ${category.name}`}
              className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm"
            />
          </div>
          <div className="relative">
            <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <select
              name="sort"
              defaultValue={sort}
              className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm"
            >
              <option value="featured">Featured</option>
              <option value="name-asc">Name A-Z</option>
              <option value="price-asc">Price low to high</option>
              <option value="price-desc">Price high to low</option>
            </select>
          </div>
          <Button type="submit" className="h-10 md:px-5">
            Apply
          </Button>
        </form>
      </section>

      <CategoryBuyingGuide categorySlug={category.slug} />

      {products.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
            <Sprout className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="mt-4 text-base font-medium">No products found in this category</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Try a different search term or explore nearby categories for similar grow supplies.
          </p>
          <Button asChild variant="link" className="mt-3">
            <Link href="/catalog">
              Browse the full catalog <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        <section className="space-y-3 rounded-xl border bg-card p-5 text-card-foreground">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Keep exploring
            </p>
            <h2 className="mt-1 text-sm font-semibold">Related growing categories</h2>
          </div>
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
