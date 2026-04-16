// apps/web/src/components/storefront/product-card.tsx
import type { AttributeValue, CategoryTemplateKey } from "@base-ecommerce/domain";
import Link from "next/link";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getProductCardMeta } from "@/features/catalog/product-card-meta";
import { formatCurrencyFromCents, getPriceDisplay } from "@/features/catalog/pricing";

type ProductCardProps = {
  name: string;
  categorySlug: string;
  categoryName: string;
  productSlug: string;
  currency: "MXN" | "USD";
  minPriceCents: number;
  compareAtPriceCents?: number | undefined;
  hasStock: boolean;
  templateKey: CategoryTemplateKey;
  attributeValues: Record<string, AttributeValue>;
};

export function ProductCard({
  name,
  categorySlug,
  categoryName,
  productSlug,
  currency,
  minPriceCents,
  compareAtPriceCents,
  hasStock,
  templateKey,
  attributeValues,
}: ProductCardProps) {
  const pricing = getPriceDisplay(minPriceCents, compareAtPriceCents);
  const href = `/catalog/${categorySlug}/${productSlug}`;
  const meta = getProductCardMeta(templateKey, attributeValues);

  // NOTE: Card-level attributes are drawn from the first (default) variant.
  // For products with divergent variants, the caller should pass a merged snapshot.
  return (
    <div className="group relative rounded-lg border bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-primary/30 focus-within:-translate-y-1 focus-within:shadow-md focus-within:border-primary/30">
      <Link href={href} className="block focus:outline-none">
        {/* Image area */}
        <div className="relative flex h-40 items-center justify-center bg-gradient-to-br from-secondary/40 to-secondary/70">
          <Package className="h-12 w-12 text-muted-foreground/20 transition-transform duration-300 group-hover:scale-110" />

          {pricing.hasDiscount && (
            <div className="absolute top-2 left-2">
              <Badge variant="destructive" className="rounded-full text-[10px] px-2 py-0.5">
                −{pricing.discountPercent}%
              </Badge>
            </div>
          )}

          {meta.badges.length > 0 && (
            <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
              {meta.badges.map((badge, badgeIndex) => (
                <Badge
                  key={`${badge}-${badgeIndex}`}
                  variant="outline"
                  className="rounded-full text-[10px] px-2 py-0.5 bg-background/90 border-border/50"
                >
                  {badge}
                </Badge>
              ))}
            </div>
          )}

          <div className="absolute bottom-2 left-2">
            <Badge
              variant="outline"
              className="rounded-full text-[10px] px-2 py-0.5 bg-background/90 border-border/50 font-medium text-muted-foreground"
            >
              {categoryName}
            </Badge>
          </div>

          {!hasStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/65 backdrop-blur-sm">
              <Badge variant="secondary" className="text-xs tracking-widest uppercase">
                Sold out
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <h3 className="font-semibold text-sm leading-snug text-foreground line-clamp-2 mb-1.5">
            {name}
          </h3>

          {/* Family-specific attributes */}
          {meta.lines.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-2">
              {meta.lines.map((line, index) => (
                <span key={index} className="text-[11px] text-muted-foreground">
                  {line}
                  {index < meta.lines.length - 1 ? (
                    <span className="ml-2 text-border">·</span>
                  ) : null}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">
              {formatCurrencyFromCents(pricing.currentCents, currency)}
            </span>
            {pricing.hasDiscount && (
              <span className="text-xs text-muted-foreground line-through">
                {formatCurrencyFromCents(pricing.compareAtCents ?? 0, currency)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
