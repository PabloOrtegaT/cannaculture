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
                {home.activeBanner ? (home.activeBanner.ctaLabel ?? "Shop the sale") : "Explore catalog"}
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
