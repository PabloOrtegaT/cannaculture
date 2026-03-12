import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductPurchasePanel } from "@/components/storefront/product-purchase-panel";
import { formatCurrencyFromCents, getPriceDisplay } from "@/features/catalog/pricing";
import { getProductByRoute } from "@/server/data/storefront-service";

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
    return {
      title: "Product not found",
    };
  }

  return {
    title: `${result.product.name} | ${result.category.name}`,
    description: result.product.description ?? `Buy ${result.product.name}`,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const resolvedParams = await params;
  const result = getProductByRoute(resolvedParams.categorySlug, resolvedParams.productSlug);
  if (!result) {
    notFound();
  }

  const defaultVariant = result.variants.find((variant) => variant.isDefault) ?? result.variants[0] ?? null;
  const basePricing = getPriceDisplay(result.product.priceCents, result.product.compareAtPriceCents);

  return (
    <main className="space-y-6">
      <header className="space-y-2">
        <Link href={`/catalog/${result.category.slug}`} className="text-sm text-muted-foreground hover:underline">
          {result.category.name}
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">{result.product.name}</h1>
        {result.product.description && <p className="max-w-2xl text-sm text-muted-foreground">{result.product.description}</p>}
        <div className="flex items-center gap-2">
          <p className="font-semibold">
            {formatCurrencyFromCents(basePricing.currentCents, result.product.currency)}
          </p>
          {basePricing.hasDiscount && (
            <>
              <p className="text-sm text-muted-foreground line-through">
                {formatCurrencyFromCents(basePricing.compareAtCents ?? 0, result.product.currency)}
              </p>
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                -{basePricing.discountPercent}%
              </span>
            </>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="space-y-4 rounded-lg border bg-card p-5 text-card-foreground">
          <h2 className="text-xl font-medium">Attributes</h2>
          <div className="grid gap-2">
            {Object.entries(defaultVariant?.attributeValues ?? {}).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm">
                <span className="text-muted-foreground">{key}</span>
                <span className="font-medium">{String(value)}</span>
              </div>
            ))}
          </div>
        </section>

        <ProductPurchasePanel
          productId={result.product.id}
          productName={result.product.name}
          categorySlug={result.category.slug}
          productSlug={result.product.slug}
          currency={result.product.currency}
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
    </main>
  );
}
