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
