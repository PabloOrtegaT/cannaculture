import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@base-ecommerce/ui";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { ProductCard } from "@/components/storefront/product-card";
import { getHomeContent, listCatalogProducts } from "@/server/data/storefront-service";

export const metadata: Metadata = {
  title: "Base Ecommerce | News, Sales, and Featured Products",
  description: "Stay updated with latest news, active discounts, and featured products.",
};

export default function HomePage() {
  const home = getHomeContent();
  const catalogProducts = listCatalogProducts();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-start px-6 py-10">
      <div className="w-full space-y-8">
        <section className="space-y-3 rounded-lg border bg-card p-6 text-card-foreground">
          <h1 className="text-3xl font-semibold tracking-tight">Storefront Home</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            This home page is server-rendered and driven by admin-managed data models (news, promo
            banners, and featured sales).
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link href="/catalog">Explore catalog</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin">Admin snapshot</Link>
            </Button>
            <ThemeToggle />
          </div>
        </section>

        {home.activeBanner && (
          <section className="rounded-lg border border-primary/30 bg-primary/10 p-6 text-card-foreground">
            <p className="text-sm font-medium text-primary">Sales Banner</p>
            <h2 className="mt-1 text-2xl font-semibold">{home.activeBanner.title}</h2>
            {home.activeBanner.subtitle && (
              <p className="mt-1 text-sm text-muted-foreground">{home.activeBanner.subtitle}</p>
            )}
            {home.activeBanner.ctaHref && home.activeBanner.ctaLabel && (
              <Button asChild className="mt-4">
                <Link href={home.activeBanner.ctaHref}>{home.activeBanner.ctaLabel}</Link>
              </Button>
            )}
          </section>
        )}

        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">Featured Sales</h2>
            <Link href="/catalog" className="text-sm text-muted-foreground hover:underline">
              View all products
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {home.featuredProducts.map((featured) => {
              const cardData = catalogProducts.find((entry) => entry.product.id === featured.id);
              if (!cardData || !cardData.category) {
                return null;
              }
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

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">News</h2>
          <div className="grid gap-3">
            {home.news.map((news) => (
              <article key={news.id} className="rounded-lg border bg-card p-4 text-card-foreground">
                <h3 className="font-medium">{news.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{news.summary}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
