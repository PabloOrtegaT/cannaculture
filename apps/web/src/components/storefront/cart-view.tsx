"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { Button } from "@base-ecommerce/ui";
import { calculateCartTotals, getUnavailableCartItems } from "@/features/cart/cart";
import { useCartStore } from "@/features/cart/cart-store";
import { formatCurrencyFromCents } from "@/features/catalog/pricing";

type CartViewProps = {
  authenticated: boolean;
};

export function CartView({ authenticated }: CartViewProps) {
  const cart = useCartStore((state) => state.cart);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const mergeSummary = useCartStore((state) => state.mergeSummary);
  const pendingVariantIds = useCartStore((state) => state.pendingVariantIds);
  const syncError = useCartStore((state) => state.syncError);
  const clearMergeSummary = useCartStore((state) => state.clearMergeSummary);
  const hydrateCart = useCartStore((state) => state.hydrateCart);

  useEffect(() => {
    if (!authenticated) {
      return;
    }

    const loadServerCart = async () => {
      const response = await fetch("/api/cart", { method: "GET" });
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as { cart: typeof cart; version: number };
      hydrateCart(payload.cart, { version: payload.version });
    };

    loadServerCart();
  }, [authenticated, hydrateCart]);

  const totals = useMemo(() => calculateCartTotals(cart), [cart]);
  const unavailableItems = useMemo(() => getUnavailableCartItems(cart), [cart]);

  if (cart.items.length === 0) {
    return (
      <main className="mx-auto w-full max-w-4xl space-y-4 px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Your cart</h1>
        <p className="text-sm text-muted-foreground">Your cart is empty.</p>
        <Button asChild>
          <Link href="/catalog">Explore products</Link>
        </Button>
      </main>
    );
  }

  const currency = cart.items[0]?.currency ?? "MXN";

  return (
    <main className="mx-auto w-full max-w-4xl space-y-5 px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Your cart</h1>

      {syncError && (
        <section className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-card-foreground">
          {syncError}
        </section>
      )}

      {mergeSummary.messages.length > 0 && (
        <section className="space-y-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-card-foreground">
          <p className="font-medium">Cart merge summary</p>
          <ul className="list-disc space-y-1 pl-5">
            {mergeSummary.messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
          <Button variant="outline" onClick={clearMergeSummary}>
            Dismiss
          </Button>
        </section>
      )}

      {unavailableItems.length > 0 && (
        <section className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-card-foreground">
          <p className="font-medium">Some items require attention before checkout:</p>
          <ul className="list-disc space-y-1 pl-5">
            {unavailableItems.map((item) => (
              <li key={item.variantId}>
                {item.name} ({item.variantName}): {item.unavailableReason}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        {cart.items.map((item) => {
          const isPending = pendingVariantIds.includes(item.variantId);

          return (
            <article key={item.variantId} className="rounded-lg border bg-card p-4 text-card-foreground">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <Link href={item.href} className="font-medium hover:underline">
                    {item.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">{item.variantName}</p>
                  <p className="text-sm text-muted-foreground">{formatCurrencyFromCents(item.unitPriceCents, item.currency)}</p>
                  {item.unavailableReason && <p className="text-sm text-amber-700">{item.unavailableReason}</p>}
                  {isPending && <p className="text-xs text-muted-foreground">Updating quantity...</p>}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                    disabled={isPending || item.quantity <= 1}
                    aria-label={`Decrease ${item.name} quantity`}
                  >
                    -
                  </Button>
                  <p className="w-12 text-center text-sm font-medium" data-testid={`cart-qty-${item.variantId}`}>
                    {item.quantity}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                    disabled={isPending || item.quantity >= item.stockOnHand || item.stockOnHand <= 0}
                    aria-label={`Increase ${item.name} quantity`}
                  >
                    +
                  </Button>
                  <Button variant="ghost" onClick={() => removeItem(item.variantId)} disabled={isPending}>
                    Remove
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="rounded-lg border bg-card p-4 text-card-foreground">
        <p className="text-sm text-muted-foreground">Items available for checkout: {totals.itemCount}</p>
        <p className="text-lg font-semibold">Subtotal: {formatCurrencyFromCents(totals.subtotalCents, currency)}</p>
      </section>
    </main>
  );
}
