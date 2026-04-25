// apps/web/src/components/storefront/product-card.tsx
import { Badge } from "@cannaculture/ui";
import type { AttributeValue, CategoryTemplateKey } from "@cannaculture/domain";
import Link from "next/link";
import { Leaf, Sun, Droplets, FlaskConical, Shovel, Flower2 } from "lucide-react";
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

/**
 * Per-template visual config for the card image area.
 * Each entry maps to a gradient, a placeholder icon, and an optional
 * context label shown when no attribute lines exist.
 */
const TEMPLATE_VISUALS: Record<
  string,
  {
    gradient: string;
    icon: typeof Leaf;
    contextLabel: string;
  }
> = {
  "seed-packet": {
    gradient:
      "from-emerald-50 to-emerald-100/80 dark:from-emerald-950/30 dark:to-emerald-900/20",
    icon: Leaf,
    contextLabel: "Indoor grow",
  },
  "grow-light": {
    gradient: "from-amber-50 to-amber-100/60 dark:from-amber-950/30 dark:to-amber-900/20",
    icon: Sun,
    contextLabel: "Indoor lighting",
  },
  fertilizer: {
    gradient: "from-violet-50 to-emerald-50/60 dark:from-violet-950/20 dark:to-emerald-950/20",
    icon: FlaskConical,
    contextLabel: "Plant nutrition",
  },
  substrate: {
    gradient: "from-stone-100 to-stone-200/60 dark:from-stone-900/30 dark:to-stone-800/20",
    icon: Droplets,
    contextLabel: "Growing media",
  },
  "pot-container": {
    gradient: "from-pink-50 to-sky-50/60 dark:from-pink-950/20 dark:to-sky-950/20",
    icon: Flower2,
    contextLabel: "Containers",
  },
  "tool-accessory": {
    gradient: "from-sky-50 to-sky-100/60 dark:from-sky-950/30 dark:to-sky-900/20",
    icon: Shovel,
    contextLabel: "Grow tools",
  },
};

const DEFAULT_VISUAL = {
  gradient: "from-secondary/40 to-secondary/70",
  icon: Leaf,
  contextLabel: "",
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
  const visual = TEMPLATE_VISUALS[templateKey] ?? DEFAULT_VISUAL;
  const Icon = visual.icon;

  return (
    <div className="group relative rounded-lg border bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-primary/30 focus-within:-translate-y-1 focus-within:shadow-md focus-within:border-primary/30">
      <Link href={href} className="block focus:outline-none">
        {/* Visual area - category-tinted gradient */}
        <div
          className={`relative flex h-36 items-center justify-center bg-gradient-to-br ${visual.gradient}`}
        >
          <Icon
            aria-hidden="true"
            className="h-9 w-9 text-foreground/10 transition-transform duration-300 group-hover:scale-110"
          />

          {/* Discount flag */}
          {pricing.hasDiscount && (
            <div className="absolute top-2 left-2">
              <Badge variant="destructive" className="rounded-full text-[10px] px-2 py-0.5">
                {pricing.discountPercent}% off
              </Badge>
            </div>
          )}

          {/* Product-family badges (e.g. Heirloom, Organic, Dimmable) */}
          {meta.badges.length > 0 && (
            <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
              {meta.badges.map((badge, badgeIndex) => (
                <Badge
                  key={`${badge}-${badgeIndex}`}
                  variant="success"
                  className="rounded-full text-[10px] px-2 py-0.5"
                >
                  {badge}
                </Badge>
              ))}
            </div>
          )}

          {/* Category pill */}
          <div className="absolute bottom-2 left-2">
            <Badge
              variant="outline"
              className="rounded-full text-[10px] px-2 py-0.5 bg-background/90 border-border/50 font-medium text-muted-foreground"
            >
              {categoryName}
            </Badge>
          </div>

          {/* Sold out overlay */}
          {!hasStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/65 backdrop-blur-sm">
              <Badge variant="secondary" className="text-xs tracking-widest uppercase">
                Sold out
              </Badge>
            </div>
          )}
        </div>

        {/* Content area */}
        <div className="p-3 space-y-1.5">
          <h3 className="font-semibold text-sm leading-snug text-foreground line-clamp-2">
            {name}
          </h3>

          {/* Attribute pills */}
          {meta.lines.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              {meta.lines.map((line, index) => (
                <span
                  key={index}
                  className="inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  {line}
                </span>
              ))}
            </div>
          )}

          {/* Context label fallback */}
          {visual.contextLabel && meta.lines.length === 0 && (
            <p className="text-[11px] text-muted-foreground">{visual.contextLabel}</p>
          )}

          {/* Price + stock row */}
          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">
                {formatCurrencyFromCents(pricing.currentCents, currency)}
              </span>
              {pricing.hasDiscount && (
                <span className="text-[11px] text-muted-foreground line-through">
                  {formatCurrencyFromCents(pricing.compareAtCents ?? 0, currency)}
                </span>
              )}
            </div>
            {hasStock && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                Ready to ship
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
