# Layout Refactor Design

**Date:** 2026-03-22
**Scope:** Storefront home page, catalog page, admin dashboard — full layout and component redesign
**Approach:** Option 2 — Full component redesign, page-by-page (Catalog → Home → Dashboard)
**Constraint:** No git push; iterative — revert if unsatisfied

---

## 1. Shared Component: ProductCard

Used on both the home page (featured products) and catalog grid.

### Visual structure
- **Image area:** 160px tall, subtle gradient placeholder (`#f7f7f7` → `#eeeeee`), centered Package icon
- **Favorite button:** `♡` / `♥` toggle, circular, top-right overlay on image area. Extracted as a `FavoriteButton` client component (`"use client"`, `useState`) so `ProductCard` itself stays a server component. Not persisted.
- **Discount badge:** Red pill (`#e74c3c`), top-left overlay, only rendered when `compareAtPriceCents` exists
- **Category pill:** Semi-transparent white pill, bottom-left overlay on image area, shows `categoryName`
- **Sold-out overlay:** `rgba(255,255,255,0.65)` blur overlay with "SOLD OUT" badge — existing behavior, restyled
- **Product name:** 13px bold, `#111`, 2-line clamp
- **Star rating row:** Static visual placeholder (4 filled stars out of 5). No review count number displayed — omit the count entirely since no real data exists. Visual only.
- **Price:** 14px bold; if discounted, show strikethrough compare-at price alongside

### States
1. Normal
2. With discount (badge + strikethrough)
3. Sold out (blur overlay)
4. Favorited (♥ filled red)

### Hover
Existing `hover:-translate-y-1 hover:shadow-md hover:border-primary/30` — keep as-is.

### Props change
Add `categoryName: string` to `ProductCardProps`. Both call sites already have access to `category.name`:
- `catalog/page.tsx`: `entry.category.name` — `entry.category` is `Category | null`; already guarded by `if (!entry.category) return null` before the `ProductCard` render, so `.name` is safe
- `page.tsx` (home): `cardData.category.name` — guarded by `if (!cardData || !cardData.category) return null` before render, so `.name` is safe

Both call sites must be updated to pass `categoryName`.

### Files
- `apps/web/src/components/storefront/product-card.tsx` — full rewrite
- New: `apps/web/src/components/storefront/favorite-button.tsx` — small `"use client"` component for the ♡ toggle

---

## 2. Catalog Page

**File:** `apps/web/src/app/(storefront)/catalog/page.tsx`
**Layout:** Sidebar (220px) + product grid, within existing `max-w-5xl` storefront layout

### Page header
- Small uppercase label "Shop"
- H1 "Catalog" (32px bold)
- Search bar top-right of header row (replaces current separate search row)
- Result count: "Found N products" below header, small muted text

### Sidebar (desktop: 220px, mobile: hidden)
Sticky left panel with `bg-muted/30` background, `border-r`.

Sections (all submit via the existing form GET approach):
1. **Price, $** — two `<input type="number">` fields for `priceMin` / `priceMax` URL params (new params)
2. **Category** — checkbox list replacing the current pill links. Single-select behavior (checking one unchecks others). Maps to existing `category` URL param
3. **Sort by** — radio button list replacing the current `<select>`. Maps to existing `sort` URL param
4. **Apply filters** button — full-width, dark, submits the form

#### Price filtering — server-side implementation
- `CatalogPageProps.searchParams` extended to read `priceMin?: string` and `priceMax?: string`
- Parsing in the page: `const priceMin = resolvedSearchParams?.priceMin ? Number(resolvedSearchParams.priceMin) : undefined` (same for `priceMax`). If `Number()` produces `NaN`, treat as `undefined` (no filter applied for that bound)
- `listCatalogProducts()` in `storefront-service.ts` extended to accept `priceMin?: number` and `priceMax?: number` options
- Filtering logic (inclusive bounds): `if (priceMin !== undefined && entry.minVariantPriceCents < priceMin * 100) skip` / `if (priceMax !== undefined && entry.minVariantPriceCents > priceMax * 100) skip`

### Mobile
Sidebar hidden on mobile (`md:flex` / `hidden`). A "Filters ▾" button appears in the page header row (mobile only). Clicking it toggles an inline filter panel below the header (above the grid). **Implementation:** extract a `MobileFilterToggle` client component (`"use client"`, `useState(false)`) that wraps the button and renders the filter form inline when open. The form fields are identical to the sidebar. This keeps the catalog page itself a server component.

### Product grid
- 3-col `lg`, 2-col `md`, 1-col `sm`
- Uses new `ProductCard` component
- Empty state: existing dashed border empty state, restyled

---

## 3. Home Page

**File:** `apps/web/src/app/(storefront)/page.tsx`
**Layout:** Full-width sections within existing `max-w-5xl` content wrapper

### Section 1: Split Hero
Two-column CSS grid (`1.1fr 1fr`), stacks to single column on mobile (`< md`).

**Left column** — headline + CTA:
- Small uppercase eyebrow label (e.g. "Sale" if active banner, "Welcome" otherwise)
- H1: large bold headline from `home.activeBanner.title` or fallback "Quality products, / *delivered fast.*" (italic primary-color span)
- Subtitle: muted small text
- CTA button: dark filled, arrow icon, links to `home.activeBanner.ctaHref ?? "/catalog"`

**Right column** — two stacked promo tiles:
- **Tile 1 (dark):** Dark background (`#1a1a2e`), white headline, muted subtitle, blue CTA button, circular icon right
- **Tile 2 (warm):** Warm off-white background (`#f7f3ee`), dark headline, muted subtitle, orange CTA button, circular icon right
- Both tiles link to `/catalog` (configurable per category later)
- Tile content is hardcoded for now (not from CMS), suitable for forking/customization

### Section 2: Category visual tiles
Horizontal row of cards, one per category from `listCategories()`.
- Each tile: colored gradient top area with a themed SVG icon, category name label below
- Color-coded per category index (cycles through a palette: green, blue, pink, amber, indigo…)
- Links to `/catalog?category={slug}`
- Scrollable on mobile (`overflow-x-auto`)

### Section 3: Featured products
- Existing section structure kept: "Handpicked" label + "Featured products" H2 + "View all" ghost link
- Grid uses new `ProductCard` component (3-col lg, 2-col sm)
- Data source unchanged: `home.featuredProducts` + `listCatalogProducts()`

### Section 4: Latest news
- Existing structure kept: "Updates" label + "Latest news" H2
- Cards restyled: white bg, border, rounded-lg, slightly more padding
- Background changed to `bg-muted/30` for the section wrapper

---

## 4. Admin Dashboard

**Files:**
- `apps/web/src/app/(admin)/admin/page.tsx` — page rewrite
- `apps/web/src/app/(admin)/admin/layout.tsx` — sidebar width + active state styling
- `apps/web/src/components/admin/analytics-charts.tsx` — chart section restyled

### Layout changes (layout.tsx)
- Sidebar width: `w-56` → `w-48` (192px). Labels always visible (no icon-only mode)
- Active route highlight: indigo background pill + right border accent (`border-r-2 border-primary`)
- Inactive items: existing hover style kept

### Dashboard page (admin/page.tsx)
Replaces the current single card layout with a structured grid.

**Section 1: KPI cards row** (3-col grid)
- **Revenue card:** Purple gradient (`#6c5ce7 → #a29bfe`), white text, large bold number, trend arrow + percentage
  - Data: `analytics.salesTrend.reduce((sum, p) => sum + p.totalCents, 0)` formatted via `formatCurrencyCents`
- **Orders card:** White bg, border, total order count, green trend indicator
  - Data: `orders.length`
- **Paid orders card:** White bg, border, count of orders with `status === 'paid'`, green trend indicator
  - Data: `orders.filter(o => o.status === 'paid').length`
  - Label: "Paid Orders" (not "Delivered" — `'fulfilled'` is not a valid status in this system)

**Section 2: Chart + recent orders** (1.4fr / 1fr grid)
- **Left — Sales trend chart:** Existing `LineChart` from recharts, restyled with area fill using a `<linearGradient>`. Wrapped in a white card with border-radius
- **Right — Recent orders:** Top 4 from `orders.slice(0, 4)`, compact table with Order #, Customer, Total, Payment status badge (green = paid, amber = pending/payment_failed)

**Existing `<OrdersTable>` section:** Removed from the dashboard page. The `OrdersTable` import in `admin/page.tsx` must also be removed. The full orders table is accessible via `/admin/orders` (or the Orders nav link). The compact recent orders panel in Section 2 replaces it on the overview page.

**Section 3: Store snapshot + quick links**
- Existing snapshot counts (banners, news posts, featured sales) in 3 muted cards
- Quick nav links restyled as bordered pill buttons (same links as before)

---

## 5. Implementation Order

1. **`ProductCard`** — shared, needed by catalog and home
2. **Catalog page** — sidebar layout + wired filters
3. **Home page** — split hero + category tiles + updated featured grid
4. **Dashboard** — KPI cards + chart restyle + recent orders panel + sidebar update

---

## 6. Out of Scope

- Real product images (placeholder remains)
- Real star ratings / review system
- Persistent favorites (client state only)
- Mobile sidebar drawer for catalog (can add in follow-up)
- Promo tile CMS configuration (hardcoded for now)

---

## 7. Constraints

- No new dependencies
- No schema changes
- Server-side filtering approach unchanged (URL params → GET form)
- Must not break existing tests
- Changes are local only — no push until user approves the result
