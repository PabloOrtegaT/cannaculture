"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@base-ecommerce/ui";
import { addCartItem, calculateCartTotals } from "@/features/cart/cart";
import { readCartFromStorage, writeCartToStorage } from "@/features/cart/storage";
import { formatCurrencyFromCents, getPriceDisplay } from "@/features/catalog/pricing";

type VariantItem = {
  id: string;
  name: string;
  sku: string;
  priceCents: number;
  compareAtPriceCents?: number | undefined;
  stockOnHand: number;
};

type ProductPurchasePanelProps = {
  productId: string;
  productName: string;
  categorySlug: string;
  productSlug: string;
  currency: "MXN" | "USD";
  variants: VariantItem[];
};

export function ProductPurchasePanel({
  productId,
  productName,
  categorySlug,
  productSlug,
  currency,
  variants,
}: ProductPurchasePanelProps) {
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState<string | null>(null);

  const selectedVariant = useMemo(
    () => variants.find((variant) => variant.id === selectedVariantId) ?? variants[0] ?? null,
    [selectedVariantId, variants],
  );

  if (!selectedVariant) {
    return (
      <section className="rounded-lg border bg-card p-5 text-card-foreground">
        <p className="text-sm text-muted-foreground">This product has no variants configured yet.</p>
      </section>
    );
  }

  const price = getPriceDisplay(selectedVariant.priceCents, selectedVariant.compareAtPriceCents);
  const isOutOfStock = selectedVariant.stockOnHand <= 0;

  const onAddToCart = () => {
    const cart = readCartFromStorage();
    const nextCart = addCartItem(
      cart,
      {
        productId,
        variantId: selectedVariant.id,
        name: productName,
        variantName: selectedVariant.name,
        href: `/catalog/${categorySlug}/${productSlug}`,
        currency,
        unitPriceCents: selectedVariant.priceCents,
        stockOnHand: selectedVariant.stockOnHand,
      },
      quantity,
    );
    writeCartToStorage(nextCart);
    const totals = calculateCartTotals(nextCart);
    setFeedback(`Added to cart. You now have ${totals.itemCount} item(s).`);
  };

  return (
    <section className="space-y-4 rounded-lg border bg-card p-5 text-card-foreground">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Choose variant</p>
        <select
          value={selectedVariant.id}
          onChange={(event) => {
            setSelectedVariantId(event.target.value);
            setQuantity(1);
            setFeedback(null);
          }}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          aria-label="Variant"
        >
          {variants.map((variant) => (
            <option key={variant.id} value={variant.id}>
              {variant.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Price</p>
        <div className="flex items-center gap-2">
          <p className="text-lg font-semibold">
            {formatCurrencyFromCents(price.currentCents, currency)}
          </p>
          {price.hasDiscount && (
            <>
              <p className="text-sm text-muted-foreground line-through">
                {formatCurrencyFromCents(price.compareAtCents ?? 0, currency)}
              </p>
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                -{price.discountPercent}%
              </span>
            </>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Stock</p>
        <p data-testid="stock-status" className="text-sm">
          {isOutOfStock ? "Out of stock" : `${selectedVariant.stockOnHand} available`}
        </p>
      </div>

      <div className="space-y-1">
        <label htmlFor="qty" className="text-sm text-muted-foreground">
          Quantity
        </label>
        <input
          id="qty"
          type="number"
          min={1}
          max={Math.max(1, selectedVariant.stockOnHand)}
          value={quantity}
          onChange={(event) => {
            const parsed = Number(event.target.value);
            if (Number.isNaN(parsed)) {
              return;
            }
            const bounded = Math.max(1, Math.min(parsed, Math.max(1, selectedVariant.stockOnHand)));
            setQuantity(bounded);
          }}
          className="w-24 rounded-md border bg-background px-3 py-2 text-sm"
          disabled={isOutOfStock}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button
          data-testid="add-to-cart"
          onClick={onAddToCart}
          disabled={isOutOfStock}
          aria-disabled={isOutOfStock}
        >
          Add to cart
        </Button>
        <Button asChild variant="outline">
          <Link href="/cart">Go to cart</Link>
        </Button>
      </div>

      {feedback && <p className="text-sm text-muted-foreground">{feedback}</p>}
    </section>
  );
}
