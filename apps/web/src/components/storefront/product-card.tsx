import Link from "next/link";
import { Button } from "@base-ecommerce/ui";
import { formatCurrencyFromCents, getPriceDisplay } from "@/features/catalog/pricing";

type ProductCardProps = {
  name: string;
  description?: string | undefined;
  categorySlug: string;
  productSlug: string;
  currency: "MXN" | "USD";
  minPriceCents: number;
  compareAtPriceCents?: number | undefined;
  hasStock: boolean;
};

export function ProductCard({
  name,
  description,
  categorySlug,
  productSlug,
  currency,
  minPriceCents,
  compareAtPriceCents,
  hasStock,
}: ProductCardProps) {
  const pricing = getPriceDisplay(minPriceCents, compareAtPriceCents);
  const href = `/catalog/${categorySlug}/${productSlug}`;

  return (
    <article className="space-y-3 rounded-lg border bg-card p-4 text-card-foreground">
      <div className="space-y-1">
        <h3 className="text-lg font-medium">{name}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>

      <div className="flex items-center gap-2">
        <p className="font-semibold">{formatCurrencyFromCents(pricing.currentCents, currency)}</p>
        {pricing.hasDiscount && (
          <>
            <p className="text-sm text-muted-foreground line-through">
              {formatCurrencyFromCents(pricing.compareAtCents ?? 0, currency)}
            </p>
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              -{pricing.discountPercent}%
            </span>
          </>
        )}
      </div>

      <p className="text-sm text-muted-foreground">{hasStock ? "In stock" : "Out of stock"}</p>

      <Button asChild variant="outline">
        <Link href={href}>View product</Link>
      </Button>
    </article>
  );
}
