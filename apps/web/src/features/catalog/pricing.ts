export type PriceDisplay = {
  currentCents: number;
  compareAtCents?: number;
  hasDiscount: boolean;
  discountPercent: number;
};

export function getPriceDisplay(priceCents: number, compareAtPriceCents?: number): PriceDisplay {
  const hasDiscount =
    typeof compareAtPriceCents === "number" &&
    compareAtPriceCents > priceCents &&
    compareAtPriceCents > 0;

  if (!hasDiscount) {
    return {
      currentCents: priceCents,
      hasDiscount: false,
      discountPercent: 0,
    };
  }

  const discountPercent = Math.round(((compareAtPriceCents - priceCents) / compareAtPriceCents) * 100);

  return {
    currentCents: priceCents,
    compareAtCents: compareAtPriceCents,
    hasDiscount: true,
    discountPercent,
  };
}

export function formatCurrencyFromCents(cents: number, currency: "MXN" | "USD") {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
