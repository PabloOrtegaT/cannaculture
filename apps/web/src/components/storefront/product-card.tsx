import Link from "next/link";
import { ArrowUpRight, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
    <Link
      href={href}
      className="group block rounded-lg border bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-primary/30"
    >
      {/* Image area — warm muted placeholder, taller for editorial portrait feel */}
      <div className="relative flex h-52 items-center justify-center bg-secondary/60">
        <Package className="h-14 w-14 text-muted-foreground/20 transition-transform duration-300 group-hover:scale-110" />
        {!hasStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
            <Badge variant="secondary" className="text-xs tracking-widest uppercase">
              Sold out
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="flex-1 font-sans text-xl font-semibold leading-7 tracking-normal text-foreground">{name}</h3>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-all duration-200 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>

        {description && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}

        <div className="mt-3 flex items-center gap-2">
          <span className="font-bold text-sm">
            {formatCurrencyFromCents(pricing.currentCents, currency)}
          </span>
          {pricing.hasDiscount && (
            <>
              <span className="text-xs text-muted-foreground line-through">
                {formatCurrencyFromCents(pricing.compareAtCents ?? 0, currency)}
              </span>
              <Badge variant="default" className="text-[10px] px-1.5 py-0">
                −{pricing.discountPercent}%
              </Badge>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
