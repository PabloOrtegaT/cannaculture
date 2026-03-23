// apps/web/src/components/storefront/product-card.tsx
import Link from "next/link";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FavoriteButton } from "@/components/storefront/favorite-button";
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
}: ProductCardProps) {
  const pricing = getPriceDisplay(minPriceCents, compareAtPriceCents);
  const href = `/catalog/${categorySlug}/${productSlug}`;

  return (
    <Link
      href={href}
      className="group block rounded-lg border bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-primary/30"
    >
      {/* Image area */}
      <div className="relative flex h-40 items-center justify-center bg-gradient-to-br from-secondary/40 to-secondary/70">
        <Package className="h-12 w-12 text-muted-foreground/20 transition-transform duration-300 group-hover:scale-110" />

        <FavoriteButton />

        {pricing.hasDiscount && (
          <div className="absolute top-2 left-2">
            <Badge variant="destructive" className="rounded-full text-[10px] px-2 py-0.5">
              −{pricing.discountPercent}%
            </Badge>
          </div>
        )}

        <div className="absolute bottom-2 left-2">
          <span className="rounded-full border border-border/50 bg-background/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {categoryName}
          </span>
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

        {/* Star rating — visual placeholder */}
        <div className="flex items-center gap-0.5 mb-2" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((star) => (
            <span key={star} className={`text-xs ${star <= 4 ? "text-amber-400" : "text-muted-foreground/30"}`}>
              ★
            </span>
          ))}
        </div>

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
  );
}
