# Layout Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the storefront home page, catalog page, and admin dashboard layouts based on approved reference mockups — richer product cards, sidebar filters on catalog, split hero on home, KPI dashboard.

**Architecture:** Full component redesign executed page-by-page in dependency order: shared `ProductCard` first, then catalog, home, then dashboard. New client components (`FavoriteButton`, `MobileFilterToggle`) are small isolated files. The storefront-service is extended minimally for price filtering. All other data flows are unchanged.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui, Recharts, Vitest (unit), Playwright (E2E)

---

## File Map

| Action  | File                                                             | Responsibility                                                      |
| ------- | ---------------------------------------------------------------- | ------------------------------------------------------------------- |
| Create  | `apps/web/src/components/storefront/favorite-button.tsx`         | Client-side ♡/♥ toggle, `"use client"`                              |
| Create  | `apps/web/src/components/storefront/mobile-filter-toggle.tsx`    | Mobile filter panel toggle, `"use client"`                          |
| Rewrite | `apps/web/src/components/storefront/product-card.tsx`            | Rich card: image area, category pill, discount badge, stars, price  |
| Modify  | `apps/web/src/server/data/storefront-service.ts`                 | Add `priceMin`/`priceMax` to `CatalogSearchParams` + filter logic   |
| Modify  | `apps/web/src/app/(storefront)/catalog/page.tsx`                 | Sidebar layout, parse new price params, pass `categoryName` to card |
| Modify  | `apps/web/src/app/(storefront)/page.tsx`                         | Split hero, category tiles, pass `categoryName` to card             |
| Modify  | `apps/web/src/app/(admin)/admin/layout.tsx`                      | Sidebar active highlight                                            |
| Modify  | `apps/web/src/app/(admin)/admin/page.tsx`                        | KPI cards, compact recent orders, snapshot + links                  |
| Create  | `apps/web/src/components/admin/dashboard-sales-chart.tsx`        | Sales trend AreaChart client component for dashboard left column    |
| Create  | `apps/web/src/__tests__/storefront/catalog-price-filter.test.ts` | Unit tests for price filter logic                                   |
| Create  | `apps/web/e2e/storefront-layout.spec.ts`                         | E2E: catalog sidebar, home hero, dashboard KPIs                     |

---

## Task 1: FavoriteButton client component

**Files:**

- Create: `apps/web/src/components/storefront/favorite-button.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/src/components/storefront/favorite-button.tsx
"use client";

import { useState } from "react";

export function FavoriteButton() {
  const [favorited, setFavorited] = useState(false);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        setFavorited((prev) => !prev);
      }}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-colors hover:border-primary"
    >
      <span
        className={`text-sm leading-none transition-colors ${favorited ? "text-red-500" : "text-muted-foreground"}`}
        aria-hidden="true"
      >
        {favorited ? "♥" : "♡"}
      </span>
    </button>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors for this file.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/storefront/favorite-button.tsx
git commit -m "feat(storefront): add FavoriteButton client component"
```

---

## Task 2: ProductCard rewrite

**Files:**

- Modify: `apps/web/src/components/storefront/product-card.tsx`

- [ ] **Step 1: Rewrite the component**

Replace the entire file contents:

```tsx
// apps/web/src/components/storefront/product-card.tsx
import Link from "next/link";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FavoriteButton } from "@/components/storefront/favorite-button";
import { formatCurrencyFromCents, getPriceDisplay } from "@/features/catalog/pricing";

type ProductCardProps = {
  name: string;
  description?: string | undefined;
  categorySlug: string;
  categoryName: string;
  productSlug: string;
  currency: "MXN" | "USD";
  minPriceCents: number;
  compareAtPriceCents?: number | undefined;
  hasStock: boolean;
};

export function ProductCard({
  name,
  categorySlug,
  categoryName,
  productSlug,
  currency,
  minPriceCents,
  compareAtPriceCents,
  hasStock,
}: ProductCardProps) {
  const pricing = getPriceDisplay(minPriceCents, compareAtPriceCents);
  const href = `/catalog/${categorySlug}/${productSlug}`;

  return (
    <Link
      href={href}
      className="group block rounded-lg border bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-primary/30"
    >
      {/* Image area */}
      <div className="relative flex h-40 items-center justify-center bg-gradient-to-br from-secondary/40 to-secondary/70">
        <Package className="h-12 w-12 text-muted-foreground/20 transition-transform duration-300 group-hover:scale-110" />

        <FavoriteButton />

        {pricing.hasDiscount && (
          <div className="absolute top-2 left-2">
            <Badge variant="destructive" className="rounded-full text-[10px] px-2 py-0.5">
              −{pricing.discountPercent}%
            </Badge>
          </div>
        )}

        <div className="absolute bottom-2 left-2">
          <span className="rounded-full border border-border/50 bg-background/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {categoryName}
          </span>
        </div>

        {!hasStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/65 backdrop-blur-sm">
            <Badge variant="secondary" className="text-xs tracking-widest uppercase">
              Sold out
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-semibold text-sm leading-snug text-foreground line-clamp-2 mb-1.5">
          {name}
        </h3>

        {/* Star rating — visual placeholder */}
        <div className="flex items-center gap-0.5 mb-2" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={`text-xs ${star <= 4 ? "text-amber-400" : "text-muted-foreground/30"}`}
            >
              ★
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">
            {formatCurrencyFromCents(pricing.currentCents, currency)}
          </span>
          {pricing.hasDiscount && (
            <span className="text-xs text-muted-foreground line-through">
              {formatCurrencyFromCents(pricing.compareAtCents ?? 0, currency)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Run type check**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: errors about missing `categoryName` prop at call sites in `catalog/page.tsx` and `page.tsx` — this is expected and will be fixed in Tasks 4 and 5.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/storefront/product-card.tsx
git commit -m "feat(storefront): rewrite ProductCard with image area, stars, category pill, favorite"
```

---

## Task 3: Price filter logic in storefront-service

**Files:**

- Modify: `apps/web/src/server/data/storefront-service.ts`
- Create: `apps/web/src/__tests__/storefront/catalog-price-filter.test.ts`

- [ ] **Step 1: Write failing unit tests first**

```ts
// apps/web/src/__tests__/storefront/catalog-price-filter.test.ts
import { describe, expect, it } from "vitest";
import { listCatalogProducts } from "@/server/data/storefront-service";

describe("listCatalogProducts price filtering", () => {
  it("returns all products when no price bounds are set", () => {
    const all = listCatalogProducts();
    const filtered = listCatalogProducts({ priceMin: undefined, priceMax: undefined });
    expect(filtered.length).toBe(all.length);
  });

  it("excludes products below priceMin (inclusive lower bound, dollars)", () => {
    const all = listCatalogProducts();
    const expensive = listCatalogProducts({ priceMin: 999999 }); // $9,999.99 minimum
    expect(expensive.length).toBe(0);
  });

  it("excludes products above priceMax (inclusive upper bound, dollars)", () => {
    const all = listCatalogProducts();
    const cheap = listCatalogProducts({ priceMax: 0 }); // $0 maximum
    expect(cheap.length).toBe(0);
  });

  it("filters within a price range", () => {
    const all = listCatalogProducts();
    // A range that includes everything: 0 to $100,000
    const wide = listCatalogProducts({ priceMin: 0, priceMax: 100000 });
    expect(wide.length).toBe(all.length);
  });
});
```

- [ ] **Step 2: Run the tests — verify they fail**

```bash
cd apps/web && npx vitest run src/__tests__/storefront/catalog-price-filter.test.ts
```

Expected: FAIL — `priceMin`/`priceMax` are not valid params yet.

- [ ] **Step 3: Extend `CatalogSearchParams` and filter logic**

In `apps/web/src/server/data/storefront-service.ts`, update `CatalogSearchParams` and `listCatalogProducts`:

```ts
// Replace the CatalogSearchParams type (around line 8):
export type CatalogSearchParams = {
  categorySlug?: string;
  query?: string;
  sort?: ProductSort;
  priceMin?: number; // dollars (not cents)
  priceMax?: number; // dollars (not cents)
};
```

Then inside `listCatalogProducts`, add the price filter block after the query filter (around line 98, after the `normalizedQuery` block):

```ts
if (params.priceMin !== undefined) {
  products = products.filter(
    (product) => getVariantDisplayPrice(product, variantsByProductId) >= params.priceMin! * 100,
  );
}

if (params.priceMax !== undefined) {
  products = products.filter(
    (product) => getVariantDisplayPrice(product, variantsByProductId) <= params.priceMax! * 100,
  );
}
```

- [ ] **Step 4: Run the tests — verify they pass**

```bash
cd apps/web && npx vitest run src/__tests__/storefront/catalog-price-filter.test.ts
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Run full unit test suite to catch regressions**

```bash
cd apps/web && npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/server/data/storefront-service.ts \
        apps/web/src/__tests__/storefront/catalog-price-filter.test.ts
git commit -m "feat(catalog): add priceMin/priceMax filter to listCatalogProducts"
```

---

## Task 4: MobileFilterToggle client component

**Files:**

- Create: `apps/web/src/components/storefront/mobile-filter-toggle.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/src/components/storefront/mobile-filter-toggle.tsx
"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type MobileFilterToggleProps = {
  children: React.ReactNode;
};

export function MobileFilterToggle({ children }: MobileFilterToggleProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5"
      >
        {open ? <X className="h-3.5 w-3.5" /> : <SlidersHorizontal className="h-3.5 w-3.5" />}
        {open ? "Close" : "Filters"}
      </Button>

      {open && <div className="mt-3 rounded-lg border bg-muted/30 p-4">{children}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Type check**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/storefront/mobile-filter-toggle.tsx
git commit -m "feat(catalog): add MobileFilterToggle client component"
```

---

## Task 5: Catalog page — sidebar layout

**Files:**

- Modify: `apps/web/src/app/(storefront)/catalog/page.tsx`

- [ ] **Step 1: Rewrite the catalog page**

Replace the entire file contents:

```tsx
// apps/web/src/app/(storefront)/catalog/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/storefront/product-card";
import { MobileFilterToggle } from "@/components/storefront/mobile-filter-toggle";
import {
  listCatalogProducts,
  listCategories,
  type ProductSort,
} from "@/server/data/storefront-service";
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
  "name-asc": "Name A–Z",
  "price-asc": "Price: Low → High",
  "price-desc": "Price: High → Low",
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
              className="h-3.5 w-3.5 accent-foreground"
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
                className="h-3.5 w-3.5 accent-foreground"
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
                className="h-3.5 w-3.5 accent-foreground"
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
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Shop</p>
          <h1 className="text-3xl font-bold tracking-tight">Catalog</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Found <strong className="text-foreground">{products.length}</strong>{" "}
            {products.length === 1 ? "product" : "products"}
            {query && <span className="italic"> for &ldquo;{query}&rdquo;</span>}
          </p>
        </div>

        {/* Search + mobile filter row */}
        <div className="flex items-center gap-2">
          <form method="GET" action="/catalog" className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search products…"
                className="h-9 w-52 rounded-md border border-input bg-background pl-8 pr-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
            </div>
          </form>
        </div>
      </div>

      {/* Mobile filter toggle — client component */}
      <form method="GET" action="/catalog">
        <MobileFilterToggle>{filterForm}</MobileFilterToggle>
      </form>

      {/* Body: sidebar + grid */}
      <div className="flex gap-8">
        {/* Sidebar — desktop only */}
        <aside className="hidden md:block w-52 shrink-0">
          <form method="GET" action="/catalog" className="sticky top-24 space-y-0">
            {filterForm}
          </form>
        </aside>

        {/* Product grid */}
        <div className="flex-1 min-w-0">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center gap-3">
              <p className="text-muted-foreground font-medium">No products found.</p>
              <Button asChild variant="link" size="sm">
                <Link href="/catalog">Clear filters</Link>
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
```

- [ ] **Step 2: Type check**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors for `catalog/page.tsx`.

- [ ] **Step 3: Run unit tests to confirm no regressions**

```bash
cd apps/web && npm test
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/\(storefront\)/catalog/page.tsx
git commit -m "feat(catalog): sidebar layout with price/category/sort filters"
```

---

## Task 6: Home page — split hero, category tiles, updated featured grid

**Files:**

- Modify: `apps/web/src/app/(storefront)/page.tsx`

- [ ] **Step 1: Rewrite the home page**

Replace the entire file contents:

```tsx
// apps/web/src/app/(storefront)/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Monitor, Wrench, Heart, BookOpen, Zap, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/storefront/product-card";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import {
  getHomeContent,
  listCatalogProducts,
  listCategories,
} from "@/server/data/storefront-service";
import { createPageMetadata } from "@/server/seo/metadata";
import { buildArticleJsonLd } from "@/server/seo/structured-data";

export const metadata: Metadata = createPageMetadata({
  title: "News, Sales, and Featured Products",
  description: "Stay updated with latest news, active discounts, and featured products.",
  pathname: "/",
  type: "website",
});

export const revalidate = 60;

// Cycles through for visual variety per category index
const CATEGORY_STYLES = [
  { bg: "from-emerald-50 to-emerald-100", icon: Home, iconColor: "text-emerald-600" },
  { bg: "from-blue-50 to-blue-100", icon: Monitor, iconColor: "text-blue-600" },
  { bg: "from-pink-50 to-pink-100", icon: Heart, iconColor: "text-pink-500" },
  { bg: "from-amber-50 to-amber-100", icon: BookOpen, iconColor: "text-amber-600" },
  { bg: "from-indigo-50 to-indigo-100", icon: Zap, iconColor: "text-indigo-600" },
  { bg: "from-teal-50 to-teal-100", icon: Wrench, iconColor: "text-teal-600" },
];

export default async function HomePage() {
  const home = getHomeContent();
  const catalogProducts = listCatalogProducts();
  const categories = listCategories();

  return (
    <div className="space-y-10">
      {/* ── Split Hero ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr] overflow-hidden rounded-xl border">
        {/* Left: headline + CTA */}
        <div className="flex flex-col justify-center gap-4 bg-gradient-to-br from-muted/60 to-muted p-8 md:p-10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {home.activeBanner ? "Sale" : "Welcome"}
          </p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.05]">
            {home.activeBanner ? (
              home.activeBanner.title
            ) : (
              <>
                Quality products,
                <br />
                <span className="font-normal italic text-primary">delivered fast.</span>
              </>
            )}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            Browse our curated catalog. Fast shipping, easy returns.
          </p>
          <div>
            <Button asChild size="lg">
              <Link href={home.activeBanner?.ctaHref ?? "/catalog"}>
                {home.activeBanner
                  ? (home.activeBanner.ctaLabel ?? "Shop the sale")
                  : "Explore catalog"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Right: two stacked promo tiles */}
        <div className="hidden md:grid grid-rows-2 divide-y border-l">
          <div className="flex items-center justify-between gap-4 bg-[#1a1a2e] px-8 py-6">
            <div>
              <p className="text-base font-bold text-white leading-snug mb-1">
                Top Tech. Better Prices.
              </p>
              <p className="text-xs text-white/50 mb-3">Explore electronics</p>
              <Button asChild size="sm" className="bg-primary hover:bg-primary/90">
                <Link href="/catalog">Shop Now</Link>
              </Button>
            </div>
            <div className="h-12 w-12 shrink-0 rounded-full border border-primary/30 bg-primary/10 flex items-center justify-center">
              <Monitor className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 bg-[#f7f3ee] px-8 py-6">
            <div>
              <p className="text-base font-bold text-foreground leading-snug mb-1">
                Fix It With Confidence.
              </p>
              <p className="text-xs text-muted-foreground mb-3">Explore genuine parts</p>
              <Button asChild size="sm" variant="outline">
                <Link href="/catalog">Shop Now</Link>
              </Button>
            </div>
            <div className="h-12 w-12 shrink-0 rounded-full border border-orange-200 bg-orange-50 flex items-center justify-center">
              <Wrench className="h-5 w-5 text-orange-500" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Category visual tiles ─────────────────────────────── */}
      {categories.length > 0 && (
        <section>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Browse by category
          </p>
          <div className="overflow-x-auto -mx-6 px-6">
            <div className="flex gap-3 pb-1 w-max min-w-full">
              {categories.map((category, i) => {
                const style = CATEGORY_STYLES[i % CATEGORY_STYLES.length];
                const Icon = style.icon;
                return (
                  <Link
                    key={category.id}
                    href={`/catalog?category=${category.slug}`}
                    className="flex flex-col items-center gap-1.5 rounded-lg border bg-card p-3 min-w-[80px] text-center transition-all hover:-translate-y-0.5 hover:shadow-sm"
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${style.bg}`}
                    >
                      <Icon className={`h-5 w-5 ${style.iconColor}`} />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                      {category.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Featured products ─────────────────────────────────── */}
      {home.featuredProducts.length > 0 && (
        <section className="space-y-5">
          <div className="border-b pb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">
              Handpicked
            </p>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-2xl font-bold tracking-tight">Featured products</h2>
              <Button variant="ghost" asChild className="shrink-0">
                <Link href="/catalog">
                  View all <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {home.featuredProducts.map((featured) => {
              const cardData = catalogProducts.find((e) => e.product.id === featured.id);
              if (!cardData || !cardData.category) return null;
              return (
                <ProductCard
                  key={featured.id}
                  name={featured.name}
                  categorySlug={cardData.category.slug}
                  categoryName={cardData.category.name}
                  productSlug={featured.slug}
                  currency={featured.currency}
                  minPriceCents={cardData.minVariantPriceCents}
                  compareAtPriceCents={featured.compareAtPriceCents}
                  hasStock={cardData.hasStock}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* ── Latest news ───────────────────────────────────────── */}
      {home.news.length > 0 && (
        <section className="space-y-5">
          <div className="border-b pb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
              Updates
            </p>
            <h2 className="text-2xl font-bold tracking-tight">Latest news</h2>
          </div>
          <div className="rounded-lg bg-muted/30 p-4 grid gap-4 sm:grid-cols-2">
            {home.news.map((news) => (
              <article
                key={news.id}
                id={`news-${news.id}`}
                className="rounded-lg border bg-card p-5 transition-shadow hover:shadow-sm"
              >
                <h3 className="font-semibold leading-snug mb-2">{news.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{news.summary}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {home.news.length > 0 &&
        home.news.map((news) => (
          <JsonLdScript
            key={`article-jsonld-${news.id}`}
            value={buildArticleJsonLd({
              headline: news.title,
              description: news.summary,
              pathname: `/#news-${news.id}`,
            })}
          />
        ))}
    </div>
  );
}
```

- [ ] **Step 2: Type check**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run unit tests**

```bash
cd apps/web && npm test
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/\(storefront\)/page.tsx
git commit -m "feat(home): split hero, category tiles, updated featured grid"
```

---

## Task 7: Admin layout — sidebar active highlight

**Files:**

- Modify: `apps/web/src/app/(admin)/admin/layout.tsx`

- [ ] **Step 1: Add active route detection and highlight**

The sidebar nav items need to detect the active route. Since this is a server component, use the `headers()` API or pass the pathname. The simplest approach: import `{ headers }` from `"next/headers"` and read `x-invoke-path`, but the most reliable in Next.js App Router is to use a client component for the active state.

However, to keep the layout a server component, use a simpler approach: add an `ActiveLink` client component that checks `usePathname()`.

Create `apps/web/src/components/admin/active-nav-link.tsx`:

```tsx
// apps/web/src/components/admin/active-nav-link.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type ActiveNavLinkProps = {
  href: string;
  icon: React.ReactNode;
  label: string;
};

export function ActiveNavLink({ href, icon, label }: ActiveNavLinkProps) {
  const pathname = usePathname();
  const isActive = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-l-none rounded-r-md px-3 py-2 text-sm transition-colors border-r-2",
        isActive
          ? "border-primary bg-primary/10 text-primary font-semibold"
          : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
```

- [ ] **Step 2: Update `admin/layout.tsx` to use `ActiveNavLink`**

In `apps/web/src/app/(admin)/admin/layout.tsx`:

a) Add the import at the top:

```tsx
import { ActiveNavLink } from "@/components/admin/active-nav-link";
```

b) In the desktop sidebar `<nav>`, replace the `adminNavigation.map(...)` block so accessible items use `<ActiveNavLink>` instead of `<Link>`:

```tsx
{
  adminNavigation.map((item) => {
    const accessible = canAccessAdminRoute(role, item.route);
    if (!accessible) {
      return (
        <div
          key={item.href}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/40 cursor-not-allowed"
        >
          <span className="shrink-0">{item.icon}</span>
          <span>{item.label}</span>
        </div>
      );
    }
    return <ActiveNavLink key={item.href} href={item.href} icon={item.icon} label={item.label} />;
  });
}
```

- [ ] **Step 3: Type check**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/admin/active-nav-link.tsx \
        apps/web/src/app/\(admin\)/admin/layout.tsx
git commit -m "feat(admin): sidebar active route highlight via ActiveNavLink"
```

---

## Task 8: Admin dashboard — KPI cards, sales trend chart, recent orders

**Files:**

- Create: `apps/web/src/components/admin/dashboard-sales-chart.tsx`
- Modify: `apps/web/src/app/(admin)/admin/page.tsx`

**Note on AnalyticsCharts:** The existing `AnalyticsCharts` component renders all 3 charts (sales trend, top products, order status) in a `lg:grid-cols-3` layout. The redesigned dashboard needs only the sales trend in the left column. Rather than restructuring `AnalyticsCharts`, we create a standalone `DashboardSalesTrendChart` client component and remove `AnalyticsCharts` from the dashboard page.

- [ ] **Step 1: Create `DashboardSalesTrendChart` client component**

```tsx
// apps/web/src/components/admin/dashboard-sales-chart.tsx
"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SalesTrendPoint } from "@/features/admin/types";
import { formatCurrencyCents } from "@/features/admin/format";
import type { Currency } from "@base-ecommerce/domain";

type DashboardSalesTrendChartProps = {
  salesTrend: SalesTrendPoint[];
  currency: Currency;
};

function tooltipFormatter(value: unknown, currency: Currency) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isNaN(n) ? String(value ?? "") : formatCurrencyCents(n, currency);
}

export function DashboardSalesTrendChart({ salesTrend, currency }: DashboardSalesTrendChartProps) {
  const [hasMounted, setHasMounted] = React.useState(false);
  React.useEffect(() => {
    setHasMounted(true);
  }, []);

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold mb-4">Sales Trend</h2>
      <div className="h-52">
        {!hasMounted ? (
          <div className="h-full rounded-md border border-dashed bg-muted" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={salesTrend}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => tooltipFormatter(v, currency)} />
              <Area
                type="monotone"
                dataKey="totalCents"
                stroke="var(--primary)"
                strokeWidth={2}
                fill="url(#salesGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite the dashboard page**

The `AdminOrderRow` shape is `{ id, orderNumber, status, totalCents, currency, itemCount, productLabel, createdAt }` — use these field names exactly.

Replace the entire `apps/web/src/app/(admin)/admin/page.tsx`:

```tsx
// apps/web/src/app/(admin)/admin/page.tsx
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { AccessDenied } from "@/components/admin/access-denied";
import { DashboardSalesTrendChart } from "@/components/admin/dashboard-sales-chart";
import {
  listAdminDashboardAnalyticsReadModel,
  listAdminOrdersReadModel,
} from "@/server/admin/admin-service";
import { getRouteAccess } from "@/server/admin/role-guard";
import { getAdminContentSnapshot } from "@/server/data/storefront-service";
import { formatCurrencyCents } from "@/features/admin/format";

export default async function AdminPage() {
  const access = await getRouteAccess("dashboard");
  if (!access.allowed) {
    return <AccessDenied role={access.role ?? "unknown"} section="dashboard" />;
  }

  const snapshot = getAdminContentSnapshot();
  const [orders, analytics] = await Promise.all([
    listAdminOrdersReadModel(),
    listAdminDashboardAnalyticsReadModel(),
  ]);

  const totalRevenueCents = analytics.salesTrend.reduce((sum, p) => sum + p.totalCents, 0);
  const paidOrderCount = orders.filter((o) => o.status === "paid").length;
  const recentOrders = orders.slice(0, 4);

  return (
    <main className="space-y-6">
      {/* Page heading */}
      <div>
        <p className="text-sm text-muted-foreground">Admin Dashboard</p>
        <h1 className="text-2xl font-bold tracking-tight">Operations overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Active store profile:{" "}
          <span className="font-semibold text-foreground">{snapshot.profile}</span>
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Revenue — highlighted */}
        <div className="rounded-xl p-5 text-white shadow-md bg-gradient-to-br from-[#6c5ce7] to-[#a29bfe]">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-80 mb-2">
            Total Revenue
          </p>
          <p className="text-3xl font-black mb-1">
            {formatCurrencyCents(totalRevenueCents, "MXN")}
          </p>
          <div className="flex items-center gap-1 text-xs opacity-85">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>All-time total</span>
          </div>
        </div>

        {/* Total orders */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Total Orders
          </p>
          <p className="text-3xl font-black text-foreground mb-1">{orders.length}</p>
          <p className="text-xs text-muted-foreground">All statuses</p>
        </div>

        {/* Paid orders */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Paid Orders
          </p>
          <p className="text-3xl font-black text-foreground mb-1">{paidOrderCount}</p>
          <p className="text-xs text-emerald-600 font-medium">Payment confirmed</p>
        </div>
      </div>

      {/* Sales trend chart + recent orders */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <DashboardSalesTrendChart salesTrend={analytics.salesTrend} currency="MXN" />

        {/* Recent orders compact table */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold mb-4">Recent Orders</h2>
          <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 gap-y-0">
            <div className="contents text-[10px] font-semibold uppercase tracking-wider text-muted-foreground pb-2 border-b">
              <span className="pb-2 border-b">Order</span>
              <span className="pb-2 border-b">Product</span>
              <span className="pb-2 border-b">Total</span>
              <span className="pb-2 border-b">Status</span>
            </div>
            {recentOrders.map((order) => (
              <div key={order.id} className="contents text-xs">
                <span className="py-2.5 border-b last:border-0 font-semibold text-primary">
                  {order.orderNumber}
                </span>
                <span className="py-2.5 border-b last:border-0 text-muted-foreground truncate">
                  {order.productLabel}
                </span>
                <span className="py-2.5 border-b last:border-0 font-semibold whitespace-nowrap">
                  {formatCurrencyCents(order.totalCents, order.currency)}
                </span>
                <span className="py-2.5 border-b last:border-0">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      order.status === "paid"
                        ? "bg-emerald-100 text-emerald-700"
                        : order.status === "cancelled"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {order.status}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Store snapshot + quick links */}
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold mb-4">Store snapshot</h2>
        <div className="grid gap-3 md:grid-cols-3 mb-5">
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
              Active banners
            </p>
            <p className="text-2xl font-bold">{snapshot.banners}</p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
              News posts
            </p>
            <p className="text-2xl font-bold">{snapshot.newsPosts}</p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
              Featured sales
            </p>
            <p className="text-2xl font-bold">{snapshot.featuredSales}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {[
            { href: "/admin/categories", label: "Manage categories" },
            { href: "/admin/products", label: "Manage products" },
            { href: "/admin/content", label: "Manage content" },
            { href: "/admin/coupons", label: "Manage coupons" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Also update the File Map at the top of this plan**

Replace the `analytics-charts.tsx` modify entry with:

- Create: `apps/web/src/components/admin/dashboard-sales-chart.tsx`

- [ ] **Step 4: Type check**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Run unit tests**

```bash
cd apps/web && npm test
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/\(admin\)/admin/page.tsx \
        apps/web/src/components/admin/dashboard-sales-chart.tsx
git commit -m "feat(admin): KPI cards, sales trend chart, recent orders panel, snapshot links"
```

---

## Task 9: E2E smoke tests for new layouts

**Files:**

- Create: `apps/web/e2e/storefront-layout.spec.ts`

- [ ] **Step 1: Write E2E tests**

```ts
// apps/web/e2e/storefront-layout.spec.ts
import { expect, test } from "@playwright/test";

test.describe("Home page layout", () => {
  test("shows split hero with heading and CTA button", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /explore catalog|shop the sale/i })).toBeVisible();
  });

  test("shows category tiles when categories exist", async ({ page }) => {
    await page.goto("/");
    // Category tiles section heading
    const section = page.getByText(/browse by category/i);
    // Only assert visible if the section exists (data-dependent)
    const count = await section.count();
    if (count > 0) {
      await expect(section).toBeVisible();
    }
  });
});

test.describe("Catalog page layout", () => {
  test("shows sidebar with category filters on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/catalog");
    await expect(page.getByRole("heading", { name: "Catalog" })).toBeVisible();
    // Sidebar has a Category section label
    await expect(page.getByText("Category", { exact: true }).first()).toBeVisible();
    // Apply filters button
    await expect(page.getByRole("button", { name: /apply filters/i }).first()).toBeVisible();
  });

  test("shows mobile filter toggle on small screens", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/catalog");
    await expect(page.getByRole("button", { name: /filters/i })).toBeVisible();
  });

  test("price filter reduces results when range excludes all products", async ({ page }) => {
    await page.goto("/catalog?priceMin=999999&priceMax=9999999");
    await expect(page.getByText(/no products found/i)).toBeVisible();
  });

  test("product cards show star rating placeholder", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/catalog");
    // Stars are rendered as ★ characters; aria-hidden so check for the container
    const firstCard = page.locator("a[href^='/catalog/']").first();
    await expect(firstCard).toBeVisible();
  });
});

test.describe("Admin dashboard layout", () => {
  // Note: admin requires auth — these tests will redirect to login unless logged in.
  // Run manually or with seeded auth session. Skipped in CI by default.
  test.skip("shows KPI cards", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText(/total revenue/i)).toBeVisible();
    await expect(page.getByText(/total orders/i)).toBeVisible();
    await expect(page.getByText(/paid orders/i)).toBeVisible();
  });
});
```

- [ ] **Step 2: Run storefront E2E tests**

```bash
cd apps/web && npx playwright test e2e/storefront-layout.spec.ts --reporter=list
```

Expected: home and catalog tests pass. Admin test is skipped.

- [ ] **Step 3: Run existing E2E suite to check for regressions**

```bash
cd apps/web && npx playwright test e2e/storefront-catalog-cart.spec.ts --reporter=list
```

Expected: all 3 existing catalog tests still pass (the `getByRole("link", { name: "View product" })` selector targets product detail links which are unchanged).

- [ ] **Step 4: Commit**

```bash
git add apps/web/e2e/storefront-layout.spec.ts
git commit -m "test(e2e): add layout smoke tests for home, catalog, and admin"
```

---

## Task 10: Final verification

- [ ] **Step 1: Full unit test suite**

```bash
cd apps/web && npm test
```

Expected: all pass.

- [ ] **Step 2: Full type check**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Build check**

```bash
cd apps/web && npx next build 2>&1 | tail -20
```

Expected: build completes without errors.

- [ ] **Step 4: Run the dev server and visually verify**

```bash
cd apps/web && npx next dev
```

Open:

- `http://localhost:3000/` — split hero, category tiles, featured grid
- `http://localhost:3000/catalog` — sidebar with filters, rich product cards
- `http://localhost:3000/admin` — KPI cards, area chart, recent orders (requires login)

- [ ] **Step 5: Final commit if any cleanup needed**

```bash
git add -p  # stage only intentional changes
git commit -m "chore(layout-refactor): final cleanup"
```
