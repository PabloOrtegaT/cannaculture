"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@base-ecommerce/ui";
import { calculateCartTotals, emptyCartState, removeCartItem, updateCartItemQuantity, type CartState } from "@/features/cart/cart";
import { readCartFromStorage, writeCartToStorage } from "@/features/cart/storage";
import { formatCurrencyFromCents } from "@/features/catalog/pricing";

export function CartView() {
  const [cart, setCart] = useState<CartState>(() =>
    typeof window === "undefined" ? emptyCartState : readCartFromStorage(),
  );

  const totals = useMemo(() => calculateCartTotals(cart), [cart]);

  const applyCart = (nextCart: CartState) => {
    setCart(nextCart);
    writeCartToStorage(nextCart);
  };

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

      <section className="space-y-3">
        {cart.items.map((item) => (
          <article key={item.variantId} className="rounded-lg border bg-card p-4 text-card-foreground">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Link href={item.href} className="font-medium hover:underline">
                  {item.name}
                </Link>
                <p className="text-sm text-muted-foreground">{item.variantName}</p>
                <p className="text-sm text-muted-foreground">
                  {formatCurrencyFromCents(item.unitPriceCents, item.currency)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, item.stockOnHand)}
                  value={item.quantity}
                  onChange={(event) => {
                    const parsed = Number(event.target.value);
                    if (Number.isNaN(parsed)) {
                      return;
                    }
                    const next = updateCartItemQuantity(cart, item.variantId, parsed);
                    applyCart(next);
                  }}
                  className="w-20 rounded-md border bg-background px-2 py-1 text-sm"
                />
                <Button
                  variant="ghost"
                  onClick={() => {
                    const next = removeCartItem(cart, item.variantId);
                    applyCart(next);
                  }}
                >
                  Remove
                </Button>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-lg border bg-card p-4 text-card-foreground">
        <p className="text-sm text-muted-foreground">Items: {totals.itemCount}</p>
        <p className="text-lg font-semibold">
          Subtotal: {formatCurrencyFromCents(totals.subtotalCents, currency)}
        </p>
      </section>
    </main>
  );
}
