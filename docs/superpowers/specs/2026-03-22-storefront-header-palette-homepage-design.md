# Design Spec: Storefront Header Redesign, Palette Switcher & Home Page

**Date:** 2026-03-22
**Status:** Pending user review
**Scope:** `apps/web`

---

## 1. Overview

Three coordinated changes to the storefront UI, inspired by MercadoLibre's layout:

1. **StorefrontHeader component** — extract the header from `(storefront)/layout.tsx` into its own component with a 3-column layout: logo | search | actions
2. **PalettePicker component** — icon button in the actions area that opens a dropdown with 7 color-swatch presets
3. **Home page move + redesign** — move `src/app/page.tsx` to `src/app/(storefront)/page.tsx` so it gets the storefront layout and header, then redesign body content in a MercadoLibre-style layout

---

## 2. StorefrontHeader Component

### Location
`apps/web/src/components/storefront/storefront-header.tsx`

This is a **server component** (no `"use client"`). It can import `StorefrontAuthLinks` and `ThemeToggle` (both client components) — that is valid in App Router. The mobile search behavior is CSS-only (see below), so no interactive state is needed in this file.

### Layout
3-column CSS grid on desktop, collapsed on mobile:

```
desktop:  [logo]  [  search bar  ]  [actions]
mobile:   [logo]                     [actions]
          [ search bar — full width, visible below ]
```

Implementation: `grid` with `grid-cols-1 md:grid-cols-[auto_1fr_auto]`. On mobile the search bar sits in its own row via `col-span-full md:col-auto`. No JavaScript needed.

### Columns

| Column | Content |
|--------|---------|
| Left | BaseCommerce wordmark link to `/` |
| Center | Search form (see below) |
| Right | `StorefrontAuthLinks` + `PalettePicker` + `ThemeToggle` |

### Search form
- `<form method="GET" action="/catalog">` — no JavaScript, degrades gracefully
- `<input type="search" name="q" placeholder="Search products...">` with a `<button type="submit">` search icon
- On mobile: visible as a second row below logo/actions, `col-span-full`
- On desktop (md+): occupies the center grid column, max-width constrained

### Storefront layout change
`(storefront)/layout.tsx` imports `StorefrontHeader` and removes the inline `<header>` block. The `<main>` wrapper and outer `<div>` are untouched.

---

## 3. PalettePicker Component

### Location
`apps/web/src/components/theme/palette-picker.tsx` (client component — `"use client"`)

### Behavior
- A ghost icon button with the `Swatches` or `Palette` icon from lucide-react
- On click: toggles a positioned dropdown panel (local `useState<boolean>`) — no new Radix dependency
- Dropdown: a small floating card (`absolute top-full right-0 mt-1 z-50`) with a grid of swatch circles
- Each swatch: a `button` element with a colored circle (`w-6 h-6 rounded-full`) showing the palette's primary color and a text label beneath
- Clicking a swatch:
  1. `document.documentElement.setAttribute("data-palette", name)`
  2. `localStorage.setItem("palette", name)`
  3. Closes the dropdown
- Active swatch gets a `ring-2 ring-offset-1 ring-foreground` indicator
- Click-outside closes the dropdown (via `useEffect` with a `mousedown` listener)

### Palette init script
In `app/layout.tsx`, inside the existing `<head>` JSX block, add a second inline blocking script immediately after the existing theme init `<script>` element. The script reads `localStorage.getItem("palette")` and, if the stored value is a non-default palette name, sets `document.documentElement.setAttribute("data-palette", value)` before the first paint. This follows the identical pattern of the existing theme init script in the same file.

---

## 4. Color Palette Presets (7 total)

### CSS structure in `globals.css`

Each palette override uses **two selectors**:

```
[data-palette="name"] { /* light mode + palette */ }
[data-theme="dark"][data-palette="name"] { /* dark mode + palette */ }
```

Both selectors are on the same `<html>` element, so no descendant combinator (no space between them). The dark+palette selector has specificity 0-2-0, which correctly wins over the standalone dark rule (0-1-0) and the standalone palette rule (0-1-0).

Only `--primary`, `--primary-foreground`, and `--ring` are overridden per palette. All other tokens (background, card, muted, etc.) remain as the base theme defines them.

### Palette definitions

| # | Name | Hue | Light primary | Dark primary | Inspired by |
|---|------|-----|--------------|--------------|-------------|
| 1 | `amber` | 68 | `oklch(0.62 0.175 68)` | `oklch(0.75 0.165 68)` | **Default** (defined in `:root`, no override needed) |
| 2 | `ocean` | 210 | `oklch(0.58 0.16 210)` | `oklch(0.72 0.15 210)` | Deep teal — fresh, clean |
| 3 | `crimson` | 20 | `oklch(0.55 0.22 20)` | `oklch(0.68 0.20 20)` | Deep red — bold, energetic |
| 4 | `slate` | 245 | `oklch(0.50 0.08 245)` | `oklch(0.68 0.07 245)` | Cool blue-gray — minimal |
| 5 | `grow` | 145 | `oklch(0.52 0.18 145)` | `oklch(0.68 0.17 145)` | Forest green — plants/seeds/CBD |
| 6 | `tech` | 270 | `oklch(0.58 0.22 270)` | `oklch(0.72 0.20 270)` | Electric indigo — PC components |
| 7 | `riviera` | 195 | `oklch(0.62 0.16 195)` | `oklch(0.75 0.15 195)` | Turquoise — Riviera Maya travel |

`amber` is the default and requires no override selector — it is already in `:root` and `[data-theme="dark"]`.

---

## 5. Home Page Routing Fix

The current `src/app/page.tsx` is at the root app level — it does NOT receive the `(storefront)/layout.tsx` wrapper and therefore has no storefront header.

**Fix: move the file to `src/app/(storefront)/page.tsx`.**

The URL remains `/`. The file now gets the `(storefront)` layout, which will include `StorefrontHeader`. The `HomeAuthActions` component can then be removed from the page body because auth links are now in the header.

---

## 6. Home Page Redesign

### File
`apps/web/src/app/(storefront)/page.tsx` (moved from `src/app/page.tsx`)

### Layout (top to bottom)

#### 6.1 Promotional Banner
- Full-width card: `bg-primary/10 border border-primary/20 rounded-lg p-6 md:p-10`
- Left col: eyebrow label + `h1` headline + subtext + CTA button to `ctaHref` (or `/catalog` default)
- Right col: decorative element — an abstract CSS-only shape using `bg-primary/20 rounded-full` blobs, `pointer-events-none`
- If `home.activeBanner` is null: static fallback headline "Quality products, delivered fast."

#### 6.2 Category Quick-Access Row
- `overflow-x-auto` scrollable row of category chips
- `listCategories()` data source (same as catalog page — duplication is intentional; homepage chips provide quick entry without visiting /catalog first)
- Each chip links to `/catalog?category=<slug>`
- Style: `rounded-full border px-4 py-1.5 text-sm whitespace-nowrap` — same pill pattern as catalog filter row

#### 6.3 Featured Products Grid
- Eyebrow label → `h2` → `border-b` → `grid gap-5 sm:grid-cols-2 lg:grid-cols-3`
- `home.featuredProducts` mapped to `ProductCard`
- "View all" ghost button → `/catalog`

#### 6.4 Latest News Grid
- Same section header pattern
- `grid gap-4 sm:grid-cols-2` of `article` cards

---

## 7. Files Changed

| File | Change |
|------|--------|
| `src/components/storefront/storefront-header.tsx` | **New** — 3-col header server component |
| `src/components/theme/palette-picker.tsx` | **New** — client component with dropdown swatches |
| `src/app/(storefront)/layout.tsx` | **Modified** — import StorefrontHeader, remove inline header |
| `src/app/layout.tsx` | **Modified** — add palette init script inside `<head>` block |
| `src/app/globals.css` | **Modified** — add 6 palette overrides with dual light/dark selectors |
| `src/app/(storefront)/page.tsx` | **New** — homepage moved here from root + redesigned |
| `src/app/page.tsx` | **Deleted** — replaced by `(storefront)/page.tsx` |
| `src/components/auth/home-auth-actions.tsx` | **Deleted** — no longer used after homepage move |

---

## 8. What Is NOT Changed

- `StorefrontAuthLinks` — untouched
- `ThemeToggle` — untouched
- Admin layout — redirect bug already fixed separately this session
- Auth layout — untouched
- Catalog, product, cart, account pages — untouched

---

## 9. Testing Notes

- Verify palette persists across page navigations (localStorage survives navigation)
- Verify palette + dark mode work together simultaneously (both attributes set on `html`)
- Verify homepage at `/` shows the storefront header after the file move
- Verify search form submits to `/catalog?q=` with the correct query string
- Verify mobile layout: search bar visible below logo/actions row on small screens
- No new E2E tests required for palette switcher — it is a pure client-side preference with no backend impact
