# Storefront Header Redesign, Palette Switcher & Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the storefront header into a 3-column MercadoLibre-style layout (logo | search | actions), add a 7-palette color switcher, and move/redesign the homepage to use the storefront layout.

**Architecture:** Extract the existing inline header into a `StorefrontHeader` server component; add a `PalettePicker` client component alongside the existing `ThemeToggle`; define 7 palette presets as CSS variable overrides in `globals.css` with a blocking init script; move `page.tsx` into `(storefront)/page.tsx` so it receives the storefront header.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v4, shadcn/ui (Button, Badge), lucide-react icons, `localStorage` for persistence.

---

## File Map

| File | Status | Responsibility |
|------|--------|----------------|
| `src/app/globals.css` | **Modify** | Add 6 palette override blocks |
| `src/features/theme/palette-script.ts` | **Create** | Palette init script string (same pattern as `theme-script.ts`) |
| `src/components/theme/palette-picker.tsx` | **Create** | Client component: icon button + swatch dropdown |
| `src/components/storefront/storefront-header.tsx` | **Create** | Server component: 3-col grid (logo/search/actions) |
| `src/app/(storefront)/layout.tsx` | **Modify** | Import `StorefrontHeader`, remove inline header |
| `src/app/layout.tsx` | **Modify** | Add palette init script inside the `<head>` block |
| `src/app/(storefront)/page.tsx` | **Create** | Homepage (moved from root + redesigned) |
| `src/app/page.tsx` | **Delete** | Replaced by `(storefront)/page.tsx` |
| `src/components/auth/home-auth-actions.tsx` | **Delete** | No longer used |

---

## Task 1: Add palette CSS overrides to `globals.css`

**Files:**
- Modify: `apps/web/src/app/globals.css`

The `amber` palette is already defined in `:root` — no additional selector needed.
For every other palette, add **two blocks**: one for light mode, one for dark+palette combined.
The dark+palette selector is `[data-theme="dark"][data-palette="name"]` — both attributes on the same `<html>` element, no space between them. This has specificity 0-2-0 and correctly wins over standalone dark (0-1-0) and standalone palette (0-1-0) rules.
Only `--primary`, `--primary-foreground`, and `--ring` are overridden per palette.

- [ ] **Step 1: Append the 6 palette blocks to the end of `globals.css`**

```css
/* ─── Palette overrides ──────────────────────────────────────── */
/* Only --primary, --primary-foreground, and --ring change.       */
/* Two selectors per palette: light and dark+palette combined.    */

/* Ocean — deep teal */
[data-palette="ocean"] {
  --primary: oklch(0.58 0.16 210);
  --primary-foreground: oklch(0.98 0.005 75);
  --ring: oklch(0.58 0.16 210);
}
[data-theme="dark"][data-palette="ocean"] {
  --primary: oklch(0.72 0.15 210);
  --primary-foreground: oklch(0.10 0.01 55);
  --ring: oklch(0.72 0.15 210);
}

/* Crimson — deep red */
[data-palette="crimson"] {
  --primary: oklch(0.55 0.22 20);
  --primary-foreground: oklch(0.98 0.005 75);
  --ring: oklch(0.55 0.22 20);
}
[data-theme="dark"][data-palette="crimson"] {
  --primary: oklch(0.68 0.20 20);
  --primary-foreground: oklch(0.10 0.01 55);
  --ring: oklch(0.68 0.20 20);
}

/* Slate — cool blue-gray */
[data-palette="slate"] {
  --primary: oklch(0.50 0.08 245);
  --primary-foreground: oklch(0.98 0.005 75);
  --ring: oklch(0.50 0.08 245);
}
[data-theme="dark"][data-palette="slate"] {
  --primary: oklch(0.68 0.07 245);
  --primary-foreground: oklch(0.10 0.01 55);
  --ring: oklch(0.68 0.07 245);
}

/* Grow — forest green (plants/seeds/CBD vertical) */
[data-palette="grow"] {
  --primary: oklch(0.52 0.18 145);
  --primary-foreground: oklch(0.98 0.005 75);
  --ring: oklch(0.52 0.18 145);
}
[data-theme="dark"][data-palette="grow"] {
  --primary: oklch(0.68 0.17 145);
  --primary-foreground: oklch(0.10 0.01 55);
  --ring: oklch(0.68 0.17 145);
}

/* Tech — electric indigo (PC components vertical) */
[data-palette="tech"] {
  --primary: oklch(0.58 0.22 270);
  --primary-foreground: oklch(0.98 0.005 75);
  --ring: oklch(0.58 0.22 270);
}
[data-theme="dark"][data-palette="tech"] {
  --primary: oklch(0.72 0.20 270);
  --primary-foreground: oklch(0.10 0.01 55);
  --ring: oklch(0.72 0.20 270);
}

/* Riviera — turquoise (Riviera Maya travel vertical) */
[data-palette="riviera"] {
  --primary: oklch(0.62 0.16 195);
  --primary-foreground: oklch(0.98 0.005 75);
  --ring: oklch(0.62 0.16 195);
}
[data-theme="dark"][data-palette="riviera"] {
  --primary: oklch(0.75 0.15 195);
  --primary-foreground: oklch(0.10 0.01 55);
  --ring: oklch(0.75 0.15 195);
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "feat(theme): add 6 palette override presets to globals.css"
```

---

## Task 2: Create palette init script

**Files:**
- Create: `apps/web/src/features/theme/palette-script.ts`
- Modify: `apps/web/src/app/layout.tsx`

### Why a separate `.ts` file?
The existing `theme-script.ts` exports a plain string constant (`themeInitializationScript`) that `layout.tsx` injects via a `<script __html={...}>` tag inside `<head>`. This is a trusted, static string — not user input — so there is no XSS risk. Follow the exact same pattern for the palette.

### 2a: Create `palette-script.ts`

- [ ] **Step 1: Create `apps/web/src/features/theme/palette-script.ts`**

```typescript
export const PALETTE_STORAGE_KEY = "palette";

export const paletteInitializationScript = `
(() => {
  try {
    const key = "${PALETTE_STORAGE_KEY}";
    const stored = window.localStorage.getItem(key);
    const valid = ["amber","ocean","crimson","slate","grow","tech","riviera"];
    if (stored && stored !== "amber" && valid.includes(stored)) {
      document.documentElement.setAttribute("data-palette", stored);
    }
  } catch (_) {}
})();
`;
```

> `amber` is the CSS default (`:root`) so writing no attribute is correct for it — avoids an unnecessary DOM mutation.

### 2b: Add to `app/layout.tsx`

- [ ] **Step 2: Read `apps/web/src/app/layout.tsx` to confirm current `<head>` contents**

The file currently contains (line 55):
```tsx
import { themeInitializationScript } from "@/features/theme/theme-script";
// ...
<head>
  <meta name="color-scheme" content="light dark" />
  <script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} />
</head>
```
The `dangerouslySetInnerHTML={{ __html: value }}` prop is the correct JSX pattern for injecting a raw script string. This is safe because both strings are static TypeScript module constants, not user-provided content.

- [ ] **Step 3: Add the palette import and second script**

Add import:
```tsx
import { paletteInitializationScript } from "@/features/theme/palette-script";
```

Inside `<head>`, add a second script tag immediately after the existing theme script, using the identical `dangerouslySetInnerHTML={{ __html: ... }}` pattern:
```tsx
<script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} />
<script dangerouslySetInnerHTML={{ __html: paletteInitializationScript }} />
```

- [ ] **Step 4: TypeScript check**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/theme/palette-script.ts apps/web/src/app/layout.tsx
git commit -m "feat(theme): add palette init script to root layout head"
```

---

## Task 3: Create `PalettePicker` component

**Files:**
- Create: `apps/web/src/components/theme/palette-picker.tsx`

Client component (`"use client"`). No new npm dependencies — uses `useState` for open/close and `useEffect` for click-outside detection. Active palette is read from `localStorage` after hydration (not SSR) to avoid hydration mismatch.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PALETTE_STORAGE_KEY } from "@/features/theme/palette-script";

type PaletteOption = {
  name: string;
  label: string;
  color: string;
};

const PALETTES: PaletteOption[] = [
  { name: "amber",   label: "Amber",   color: "oklch(0.62 0.175 68)"  },
  { name: "ocean",   label: "Ocean",   color: "oklch(0.58 0.16 210)"  },
  { name: "crimson", label: "Crimson", color: "oklch(0.55 0.22 20)"   },
  { name: "slate",   label: "Slate",   color: "oklch(0.50 0.08 245)"  },
  { name: "grow",    label: "Grow",    color: "oklch(0.52 0.18 145)"  },
  { name: "tech",    label: "Tech",    color: "oklch(0.58 0.22 270)"  },
  { name: "riviera", label: "Riviera", color: "oklch(0.62 0.16 195)"  },
];

export function PalettePicker() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("amber");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(PALETTE_STORAGE_KEY) ?? "amber";
    setActive(stored);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  function selectPalette(name: string) {
    if (name === "amber") {
      document.documentElement.removeAttribute("data-palette");
    } else {
      document.documentElement.setAttribute("data-palette", name);
    }
    localStorage.setItem(PALETTE_STORAGE_KEY, name);
    setActive(name);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Switch color palette"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Palette className="h-4 w-4" />
      </Button>

      {open && (
        <div
          role="dialog"
          aria-label="Color palette options"
          className="absolute right-0 top-full mt-1 z-50 w-52 rounded-md border bg-popover p-3 shadow-md"
        >
          <p className="text-xs font-medium text-muted-foreground mb-2.5">Color palette</p>
          <div className="grid grid-cols-4 gap-x-2 gap-y-3">
            {PALETTES.map((palette) => {
              const isActive = active === palette.name;
              return (
                <button
                  key={palette.name}
                  onClick={() => selectPalette(palette.name)}
                  className="flex flex-col items-center gap-1 group"
                  aria-label={palette.label}
                  aria-pressed={isActive}
                >
                  <span
                    className={`w-7 h-7 rounded-full border-2 transition-all ${
                      isActive
                        ? "border-foreground ring-2 ring-offset-1 ring-foreground/30 scale-110"
                        : "border-transparent group-hover:border-foreground/40 group-hover:scale-105"
                    }`}
                    style={{ backgroundColor: palette.color }}
                  />
                  <span className="text-[9px] text-muted-foreground leading-none">
                    {palette.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/theme/palette-picker.tsx
git commit -m "feat(theme): add PalettePicker component with 7 palette swatches"
```

---

## Task 4: Create `StorefrontHeader` server component

**Files:**
- Create: `apps/web/src/components/storefront/storefront-header.tsx`

Server component — no `"use client"`. Importing client components (`StorefrontAuthLinks`, `ThemeToggle`, `PalettePicker`) from a server component is valid in App Router. Mobile search is CSS-only (second row visible only on `< md`), so no client state is needed here.

> **Layout note:** The root `app/layout.tsx` wraps all children in `<div className="mx-auto w-full max-w-5xl">`. This means the header's `w-full` resolves to `max-w-5xl`, not the full viewport — the `border-b` and `backdrop-blur` are constrained to the centered container. This is consistent with the user's explicit request for a centered layout. If full-bleed header behavior is needed in the future, the root layout wrapper should be removed and each sub-layout should handle its own centering.

> **Layout approach:** The spec described a CSS grid layout; this implementation uses `flex` instead. The result is functionally identical — flex with `hidden md:flex` on the center search and `ml-auto` on the actions achieves the same 3-column appearance with less CSS complexity.

- [ ] **Step 1: Create the component**

```tsx
import Link from "next/link";
import { Search } from "lucide-react";
import { StorefrontAuthLinks } from "@/components/auth/storefront-auth-links";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { PalettePicker } from "@/components/theme/palette-picker";

export function StorefrontHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-5xl px-6">

        {/* Row 1: logo — search (md+) — actions */}
        <div className="flex h-16 items-center gap-4">

          {/* Left — wordmark */}
          <Link
            href="/"
            className="flex items-center gap-px leading-none select-none shrink-0"
          >
            <span className="font-display text-xl font-bold tracking-tight">Base</span>
            <span className="font-display text-xl font-normal italic text-primary tracking-tight">
              Commerce
            </span>
          </Link>

          {/* Center — search bar with submit button, hidden on mobile */}
          <form method="GET" action="/catalog" className="hidden md:flex flex-1 min-w-0">
            <div className="relative w-full">
              <input
                type="search"
                name="q"
                placeholder="Search products..."
                className="h-9 w-full rounded-md border border-input bg-background pl-3 pr-10 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>

          {/* Right — actions */}
          <div className="ml-auto flex items-center gap-1 shrink-0">
            <StorefrontAuthLinks />
            <PalettePicker />
            <ThemeToggle />
          </div>
        </div>

        {/* Row 2: mobile search bar (shown below logo/actions row) */}
        <div className="md:hidden pb-2">
          <form method="GET" action="/catalog">
            <div className="relative">
              <input
                type="search"
                name="q"
                placeholder="Search products..."
                className="h-9 w-full rounded-md border border-input bg-background pl-3 pr-10 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>

      </div>
    </header>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/storefront/storefront-header.tsx
git commit -m "feat(storefront): add StorefrontHeader component with 3-col layout and search"
```

---

## Task 5: Update storefront layout

**Files:**
- Modify: `apps/web/src/app/(storefront)/layout.tsx`

Replace the inline `<header>` with a single `<StorefrontHeader />` import. The outer `<div>` and `<main>` are unchanged.

- [ ] **Step 1: Read the file**

Read `apps/web/src/app/(storefront)/layout.tsx` to see the current imports and structure.

- [ ] **Step 2: Remove old imports; add StorefrontHeader**

Remove these imports (they are now inside `StorefrontHeader`):
```tsx
import Link from "next/link";
import { StorefrontAuthLinks } from "@/components/auth/storefront-auth-links";
import { ThemeToggle } from "@/components/theme/theme-toggle";
```

Add:
```tsx
import { StorefrontHeader } from "@/components/storefront/storefront-header";
```

- [ ] **Step 3: Replace the `<header>` block**

Replace everything from `<header className="sticky ...">` through `</header>` (inclusive) with:
```tsx
<StorefrontHeader />
```

The finished layout should look like:
```tsx
import { StorefrontHeader } from "@/components/storefront/storefront-header";

export default async function StorefrontLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-background">
      <StorefrontHeader />
      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 4: TypeScript check**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/(storefront)/layout.tsx
git commit -m "refactor(storefront): replace inline header with StorefrontHeader component"
```

---

## Task 6: Move and redesign the homepage

**Files:**
- Create: `apps/web/src/app/(storefront)/page.tsx`

**Context before writing:**
- `getHomeContent()`, `listCatalogProducts()`, and `listCategories()` are **synchronous functions** — they return plain values, not Promises. Do NOT use `await` or `Promise.all` with them.
- `getHomeContent()` returns `{ activeBanner: PromoBanner | null, news: NewsPost[], featuredProducts: Product[] }`
- `PromoBanner` fields in use: `.title` (string), `.ctaHref` (string | null | undefined)
- `listCategories()` returns `Category[]` — each has `.id`, `.name`, `.slug`
- Moving here from `src/app/page.tsx` gives the page the storefront layout and header

- [ ] **Step 1: Create `apps/web/src/app/(storefront)/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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

export default async function HomePage() {
  const home = getHomeContent();
  const catalogProducts = listCatalogProducts();
  const categories = listCategories();

  return (
    <div className="space-y-10">

      {/* ── Promotional Banner ──────────────────────────────── */}
      <div className="rounded-lg border border-primary/20 bg-primary/8 p-8 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-8">
          <div className="space-y-4 max-w-md">
            <p className="text-xs font-medium uppercase tracking-widest text-primary">
              {home.activeBanner ? "Sale" : "Welcome"}
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.05]">
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
            <p className="text-sm text-muted-foreground leading-relaxed">
              Browse our curated catalog. Fast shipping, easy returns.
            </p>
            <Button asChild>
              <Link href={home.activeBanner?.ctaHref ?? "/catalog"}>
                {home.activeBanner ? "Shop the sale" : "Explore catalog"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div
            className="hidden md:block w-48 h-48 rounded-full bg-primary/20 blur-3xl pointer-events-none shrink-0"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* ── Category quick-access ────────────────────────────── */}
      {categories.length > 0 && (
        <div className="overflow-x-auto -mx-6 px-6">
          <div className="flex gap-3 pb-1 w-max min-w-full">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/catalog?category=${category.slug}`}
                className="rounded-full border px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors text-muted-foreground border-border hover:border-foreground hover:text-foreground"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Featured products ─────────────────────────────────── */}
      {home.featuredProducts.length > 0 && (
        <section className="space-y-5">
          <div className="border-b pb-4">
            <p className="text-xs font-medium uppercase tracking-widest text-primary mb-1">
              Handpicked
            </p>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-3xl font-bold tracking-tight">Featured products</h2>
              <Button variant="ghost" asChild className="shrink-0">
                <Link href="/catalog">
                  View all <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {home.featuredProducts.map((featured) => {
              const cardData = catalogProducts.find((e) => e.product.id === featured.id);
              if (!cardData || !cardData.category) return null;
              return (
                <ProductCard
                  key={featured.id}
                  name={featured.name}
                  description={featured.description}
                  categorySlug={cardData.category.slug}
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
            <p className="text-xs font-medium uppercase tracking-widest text-primary mb-1">
              Updates
            </p>
            <h2 className="text-3xl font-bold tracking-tight">Latest news</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {home.news.map((news) => (
              <article
                key={news.id}
                id={`news-${news.id}`}
                className="rounded-md border bg-card p-6 transition-shadow hover:shadow-sm"
              >
                <h3 className="font-semibold leading-snug mb-2">{news.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{news.summary}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {home.news.map((news) => (
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

- [ ] **Step 2: TypeScript check**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(storefront)/page.tsx
git commit -m "feat(homepage): move and redesign homepage into (storefront) layout"
```

---

## Task 7: Delete replaced files

**Files:**
- Delete: `apps/web/src/app/page.tsx`
- Delete: `apps/web/src/components/auth/home-auth-actions.tsx`

- [ ] **Step 1: Delete the old root page**

```bash
rm apps/web/src/app/page.tsx
```

- [ ] **Step 2: Delete the unused component**

```bash
rm apps/web/src/components/auth/home-auth-actions.tsx
```

- [ ] **Step 3: Verify no remaining imports**

```bash
grep -r "home-auth-actions" apps/web/src
```
Expected: no output. If any files are found, remove the import from each one.

- [ ] **Step 4: TypeScript check**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git rm apps/web/src/app/page.tsx apps/web/src/components/auth/home-auth-actions.tsx
git commit -m "chore: delete root page.tsx and unused HomeAuthActions component"
```

---

## Task 8: Smoke test in browser

- [ ] **Step 1: Start dev server**

```bash
cd apps/web && npm run dev
```

- [ ] **Step 2: Check each route**

| URL | What to verify |
|-----|---------------|
| `http://localhost:3000/` | Storefront header visible (logo, search bar, cart/auth icons, palette icon, theme toggle); promotional banner; category chips row; featured products grid |
| `http://localhost:3000/catalog` | Header still present; existing catalog layout unchanged |
| `http://localhost:3000/catalog?q=test` | Search from header navigates here with `?q=test` in URL |
| `http://localhost:3000/login` | Auth layout (separate from storefront) — header should be the auth-specific one, not the storefront header |
| `http://localhost:3000/admin` | Admin layout unchanged; `<- Storefront` link goes to correct domain |

- [ ] **Step 3: Test palette switcher manually**

1. Click the palette icon → dropdown opens with 7 labeled swatches
2. Click "Ocean" → primary color changes to teal site-wide immediately
3. Reload → teal color is still active (localStorage persisted, init script applied it before paint)
4. Click "Amber" → returns to default, `data-palette` attribute removed from `<html>`
5. Enable dark mode (theme toggle) → click "Grow" → verify green palette is visible in dark mode
6. On mobile width (<768px): verify search bar appears below the logo/actions row

- [ ] **Step 4: Run E2E tests**

```bash
cd apps/web && npx playwright test
```
Expected: all existing tests pass. The homepage URL `/` is unchanged, so tests that navigate to `/` should still work.

---

## Summary of Commits

```
feat(theme): add 6 palette override presets to globals.css
feat(theme): add palette init script to root layout head
feat(theme): add PalettePicker component with 7 palette swatches
feat(storefront): add StorefrontHeader component with 3-col layout and search
refactor(storefront): replace inline header with StorefrontHeader component
feat(homepage): move and redesign homepage into (storefront) layout
chore: delete root page.tsx and unused HomeAuthActions component
```
