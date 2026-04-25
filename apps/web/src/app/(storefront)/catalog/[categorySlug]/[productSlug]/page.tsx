import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Leaf, Package2, ShieldCheck, Sprout, Truck } from "lucide-react";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { ProductPurchasePanel } from "@/components/storefront/product-purchase-panel";
import { getProductDetailMeta } from "@/features/catalog/product-detail-meta";
import { getRelatedCategoryLinks, getRelatedProductLinks } from "@/features/catalog/related-links";
import { formatCurrencyFromCents, getPriceDisplay } from "@/features/catalog/pricing";
import {
  getProductByRoute,
  listCatalogProducts,
  listCategories,
} from "@/server/data/storefront-service";
import { createPageMetadata, SEO_BRAND_NAME } from "@/server/seo/metadata";
import { buildBreadcrumbJsonLd, buildProductJsonLd } from "@/server/seo/structured-data";

type ProductPageProps = {
  params: Promise<{
    categorySlug: string;
    productSlug: string;
  }>;
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const result = getProductByRoute(resolvedParams.categorySlug, resolvedParams.productSlug);
  if (!result) {
    return { title: "Product not found" };
  }
  return createPageMetadata({
    title: `${result.product.name} | ${result.category.name} | ${SEO_BRAND_NAME}`,
    description:
      result.product.description ??
      `${result.product.name} para cultivo indoor en ${SEO_BRAND_NAME}.`,
    pathname: `/catalog/${result.category.slug}/${result.product.slug}`,
    type: "website",
  });
}

export const revalidate = 60;

export default async function ProductPage({ params }: ProductPageProps) {
  const resolvedParams = await params;
  const result = getProductByRoute(resolvedParams.categorySlug, resolvedParams.productSlug);
  if (!result) {
    notFound();
  }

  const defaultVariant = result.variants.find((v) => v.isDefault) ?? result.variants[0] ?? null;
  const basePricing = getPriceDisplay(
    result.product.priceCents,
    result.product.compareAtPriceCents,
  );
  const detailMeta = getProductDetailMeta(
    result.category.templateKey,
    defaultVariant?.attributeValues ?? {},
  );
  const totalStockOnHand = result.variants.reduce((acc, v) => acc + v.stockOnHand, 0);
  const stockLabel =
    totalStockOnHand <= 0
      ? "Currently out of stock"
      : totalStockOnHand <= 5
        ? `Low stock across variants (${totalStockOnHand})`
        : `${totalStockOnHand} units across variants`;
  const hasDetailContent =
    detailMeta.heroLines.length > 0 || detailMeta.specs.length > 0 || detailMeta.tips.length > 0;
  const relatedCategoryLinks = getRelatedCategoryLinks({
    categories: listCategories().map((entry) => ({
      id: entry.id,
      name: entry.name,
      slug: entry.slug,
      templateKey: entry.templateKey,
    })),
    currentCategoryId: result.category.id,
    currentTemplateKey: result.category.templateKey,
    limit: 4,
  });
  const relatedProductLinks = getRelatedProductLinks({
    products: listCatalogProducts({ categorySlug: result.category.slug, sort: "featured" }).map(
      (entry) => ({
        id: entry.product.id,
        name: entry.product.name,
        slug: entry.product.slug,
      }),
    ),
    currentProductId: result.product.id,
    limit: 4,
  });

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-sm text-muted-foreground"
      >
        <Link href="/catalog" className="hover:text-foreground transition-colors">
          Catalog
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link
          href={`/catalog/${result.category.slug}`}
          className="hover:text-foreground transition-colors"
        >
          {result.category.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium truncate" aria-current="page">
          {result.product.name}
        </span>
      </nav>

      {/* Product header */}
      <section className="overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-50/70 via-background to-amber-50/40 dark:from-emerald-950/20 dark:via-background dark:to-amber-950/10">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_280px] md:p-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-full bg-background/80">
                {result.category.name}
              </Badge>
              <Badge
                variant={totalStockOnHand > 0 ? "success" : "secondary"}
                className="rounded-full"
              >
                {stockLabel}
              </Badge>
            </div>

            <div className="space-y-3">
              <h1 className="font-sans text-4xl font-semibold leading-tight tracking-normal md:text-5xl">
                {result.product.name}
              </h1>
              {result.product.description && (
                <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
                  {result.product.description}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-2xl font-bold md:text-3xl">
                {formatCurrencyFromCents(basePricing.currentCents, result.product.currency)}
              </span>
              {basePricing.hasDiscount && (
                <>
                  <span className="text-muted-foreground line-through">
                    {formatCurrencyFromCents(basePricing.compareAtCents ?? 0, result.product.currency)}
                  </span>
                  <Badge variant="default">Save {basePricing.discountPercent}%</Badge>
                </>
              )}
            </div>

            {(detailMeta.badges.length > 0 || detailMeta.heroLines.length > 0) && (
              <div className="flex flex-wrap gap-2 pt-1">
                {detailMeta.badges.map((badge, idx) => (
                  <Badge key={`badge-${idx}`} variant="outline" className="rounded-full bg-background/70">
                    {badge}
                  </Badge>
                ))}
                {detailMeta.heroLines.map((line, idx) => (
                  <span
                    key={`hero-${idx}`}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-3 py-1 text-sm text-muted-foreground"
                  >
                    <Leaf className="h-3.5 w-3.5" />
                    {line}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-card/80 p-4 backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Why growers pick this
            </p>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2.5">
                <Sprout className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>Made easier to compare across variants before you commit.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Package2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>Stock is checked live so your cart reflects current availability.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>Shipping cost is calculated at checkout based on your order.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>Secure checkout flow with order tracking in your account area.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Separator />

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left column: specs + tips */}
        {hasDetailContent ? (
          <div className="space-y-4">
            {detailMeta.specs.length > 0 && (
              <Card className="overflow-hidden border-emerald-200/40 dark:border-emerald-900/30">
                <CardHeader>
                  <CardTitle className="text-base">Plant-focused specifications</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <dl className="divide-y">
                    {detailMeta.specs.map((spec) => (
                      <div
                        key={spec.key}
                        className="flex items-center justify-between py-2.5 text-sm"
                      >
                        <dt className="text-muted-foreground">{spec.label}</dt>
                        <dd className="font-medium">{spec.value}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            )}

            {detailMeta.tips.length > 0 && (
              <Card className="overflow-hidden border-amber-200/50 dark:border-amber-900/30">
                <CardHeader>
                  <CardTitle className="text-base">Before you add it to your grow</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                    {detailMeta.tips.map((tip, idx) => (
                      <li key={`tip-${idx}`}>{tip}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div />
        )}

        {/* Purchase panel */}
        <div>
          <ProductPurchasePanel
            productId={result.product.id}
            productName={result.product.name}
            categorySlug={result.category.slug}
            productSlug={result.product.slug}
            currency={result.product.currency}
            defaultVariantId={defaultVariant?.id}
            variants={result.variants.map((variant) => ({
              id: variant.id,
              name: variant.name,
              sku: variant.sku,
              priceCents: variant.priceCents,
              compareAtPriceCents: variant.compareAtPriceCents,
              stockOnHand: variant.stockOnHand,
            }))}
          />
        </div>
      </div>

      {(relatedCategoryLinks.length > 0 || relatedProductLinks.length > 0) && (
        <section className="space-y-4 rounded-xl border bg-card p-5 text-card-foreground">
          {relatedCategoryLinks.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Keep building your setup
              </p>
              <h2 className="text-sm font-semibold">Related categories</h2>
              <div className="flex flex-wrap gap-2">
                {relatedCategoryLinks.map((entry) => (
                  <Link
                    key={entry.id}
                    href={`/catalog/${entry.slug}`}
                    className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {entry.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {relatedProductLinks.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">More in {result.category.name}</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {relatedProductLinks.map((entry) => (
                  <Link
                    key={entry.id}
                    href={`/catalog/${result.category.slug}/${entry.slug}`}
                    className="rounded-md border px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {entry.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <JsonLdScript
        value={buildBreadcrumbJsonLd([
          { name: "Home", pathname: "/" },
          { name: "Catalog", pathname: "/catalog" },
          { name: result.category.name, pathname: `/catalog/${result.category.slug}` },
          {
            name: result.product.name,
            pathname: `/catalog/${result.category.slug}/${result.product.slug}`,
          },
        ])}
      />
      <JsonLdScript
        value={buildProductJsonLd({
          name: result.product.name,
          description: result.product.description ?? `Buy ${result.product.name}`,
          pathname: `/catalog/${result.category.slug}/${result.product.slug}`,
          currency: result.product.currency,
          priceCents: defaultVariant?.priceCents ?? result.product.priceCents,
          stockOnHand: result.variants.reduce((acc, v) => acc + v.stockOnHand, 0),
          sku: defaultVariant?.sku,
        })}
      />
    </div>
  );
}
