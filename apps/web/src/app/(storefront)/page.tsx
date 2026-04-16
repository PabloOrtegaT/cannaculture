import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Monitor, Wrench, Heart, BookOpen, Zap, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/storefront/product-card";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { TrustSignals } from "@/features/home/trust-signals";
import { GrowingGuide } from "@/features/home/growing-guide";
import {
  getHomeContent,
  listCatalogProducts,
  listCategories,
} from "@/server/data/storefront-service";
import { createPageMetadata, SEO_BRAND_NAME, SEO_BRAND_SUMMARY_ES } from "@/server/seo/metadata";
import { buildArticleJsonLd } from "@/server/seo/structured-data";

export const metadata: Metadata = createPageMetadata({
  title: `${SEO_BRAND_NAME} | Todo para cultivo indoor`,
  description: SEO_BRAND_SUMMARY_ES,
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
                From seed
                <br />
                <span className="font-normal italic text-primary">to harvest.</span>
              </>
            )}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            Seeds, lights, nutrients, and tools for every indoor garden.
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
          <div className="flex items-center justify-between gap-4 bg-[#1a2e1a] px-8 py-6">
            <div>
              <p className="text-base font-bold text-white leading-snug mb-1">
                LED Grow Lights for Indoor Gardens.
              </p>
              <p className="text-xs text-white/60 mb-3">Panels, strips and bulbs for every space</p>
              <Button asChild size="sm" className="bg-primary hover:bg-primary/90">
                <Link href="/catalog/grow-lights">Shop Lights</Link>
              </Button>
            </div>
            <div className="h-12 w-12 shrink-0 rounded-full border border-primary/30 bg-primary/10 flex items-center justify-center">
              <Monitor className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 bg-[#f3f7ee] px-8 py-6">
            <div>
              <p className="text-base font-bold text-foreground leading-snug mb-1">
                Heirloom Seeds & Starter Kits.
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                Curated varieties for home growers
              </p>
              <Button asChild size="sm" variant="outline">
                <Link href="/catalog/plant-seeds">Shop Seeds</Link>
              </Button>
            </div>
            <div className="h-12 w-12 shrink-0 rounded-full border border-emerald-200 bg-emerald-50 flex items-center justify-center">
              <Wrench className="h-5 w-5 text-emerald-600" />
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
                const style = CATEGORY_STYLES[i % CATEGORY_STYLES.length]!;
                const Icon = style.icon;
                return (
                  <Link
                    key={category.id}
                    href={`/catalog/${category.slug}`}
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

      <TrustSignals />

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
                  templateKey={cardData.category.templateKey}
                  attributeValues={cardData.variants[0]?.attributeValues ?? {}}
                />
              );
            })}
          </div>
        </section>
      )}

      <GrowingGuide />

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
