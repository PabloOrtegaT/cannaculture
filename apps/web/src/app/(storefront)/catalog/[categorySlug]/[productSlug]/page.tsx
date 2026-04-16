import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Leaf } from "lucide-react";
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
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
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
        <span className="text-foreground font-medium truncate">{result.product.name}</span>
      </nav>

      {/* Product header */}
      <div className="space-y-3">
        <h1 className="font-sans text-4xl font-semibold leading-tight tracking-normal">
          {result.product.name}
        </h1>
        {result.product.description && (
          <p className="text-muted-foreground max-w-2xl">{result.product.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-2xl font-bold">
            {formatCurrencyFromCents(basePricing.currentCents, result.product.currency)}
          </span>
          {basePricing.hasDiscount && (
            <>
              <span className="text-muted-foreground line-through">
                {formatCurrencyFromCents(basePricing.compareAtCents ?? 0, result.product.currency)}
              </span>
              <Badge variant="default">-{basePricing.discountPercent}%</Badge>
            </>
          )}
          {detailMeta.badges.map((badge, idx) => (
            <Badge key={`badge-${idx}`} variant="outline">
              {badge}
            </Badge>
          ))}
        </div>
        {detailMeta.heroLines.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {detailMeta.heroLines.map((line, idx) => (
              <span
                key={`hero-${idx}`}
                className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1 text-sm text-muted-foreground"
              >
                <Leaf className="h-3.5 w-3.5" />
                {line}
              </span>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left column: specs + tips */}
        {hasDetailContent ? (
          <div className="space-y-4">
            {detailMeta.specs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Specifications</CardTitle>
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
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Care & growing tips</CardTitle>
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
        <section className="space-y-4 rounded-lg border bg-card p-4 text-card-foreground">
          {relatedCategoryLinks.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">Categorías relacionadas</h2>
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
              <h2 className="text-sm font-semibold">Más productos en {result.category.name}</h2>
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
