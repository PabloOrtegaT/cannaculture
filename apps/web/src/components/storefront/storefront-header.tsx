import Link from "next/link";
import { Search, Sprout } from "lucide-react";
import { StorefrontAuthLinks } from "@/components/auth/storefront-auth-links";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { PalettePicker } from "@/components/theme/palette-picker";
import { listCategories } from "@/server/data/storefront-service";

export function StorefrontHeader() {
  const categories = listCategories();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-nav/50 backdrop-blur-md text-nav-foreground">
      <div className="mx-auto max-w-5xl px-6">
        {/* Row 1: brand — search (md+) — actions */}
        <div className="flex h-14 items-center gap-4">
          {/* Brand */}
          <Link
            href="/"
            className="flex items-center gap-1.5 leading-none select-none shrink-0"
          >
            <Sprout className="h-5 w-5 text-primary" aria-hidden="true" />
            <span className="font-display text-lg font-bold tracking-tight">Canna</span>
            <span className="font-display text-lg font-normal italic text-primary tracking-tight">
              culture
            </span>
          </Link>

          {/* Search — hidden on mobile */}
          <form method="GET" action="/catalog" className="hidden md:flex flex-1 min-w-0">
            <div className="relative w-full max-w-md">
              <input
                type="search"
                name="q"
                placeholder="Search seeds, grow lights, nutrients, substrates..."
                aria-label="Search products"
                className="h-9 w-full rounded-md border border-nav-foreground/15 bg-background/80 pl-3 pr-10 text-sm text-foreground placeholder:text-nav-foreground/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-nav-foreground/50 hover:text-nav-foreground transition-colors"
                aria-label="Search products"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-1 shrink-0 text-nav-foreground">
            <StorefrontAuthLinks />
            <PalettePicker />
            <ThemeToggle />
          </div>
        </div>

        {/* Row 2: mobile search */}
        <div className="md:hidden pb-2">
          <form method="GET" action="/catalog">
            <div className="relative">
              <input
                type="search"
                name="q"
                placeholder="Search seeds, lights, nutrients..."
                aria-label="Search products"
                className="h-9 w-full rounded-md border border-nav-foreground/15 bg-background/80 pl-3 pr-10 text-sm text-foreground placeholder:text-nav-foreground/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-nav-foreground/50 hover:text-nav-foreground transition-colors"
                aria-label="Search products"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>

        {/* Row 3: category nav strip */}
        {categories.length > 0 && (
          <nav
            aria-label="Product categories"
            className="-mx-6 px-6 flex gap-0 overflow-x-auto border-t border-nav-foreground/10"
          >
            <Link
              href="/catalog"
              className="shrink-0 px-3 py-2 text-xs font-medium text-nav-foreground/70 hover:text-nav-foreground border-b-2 border-transparent hover:border-primary transition-colors"
            >
              All products
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/catalog/${category.slug}`}
                className="shrink-0 px-3 py-2 text-xs font-medium text-nav-foreground/70 hover:text-nav-foreground border-b-2 border-transparent hover:border-primary transition-colors"
              >
                {category.name}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
