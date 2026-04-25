"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Sprout,
  ShoppingBag,
  Minus,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Truck,
  ShieldCheck,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { calculateCartTotals, getUnavailableCartItems } from "@/features/cart/cart";
import { useCartStore } from "@/features/cart/cart-store";
import { formatCurrencyFromCents } from "@/features/catalog/pricing";
import { runSingleFlight } from "@/lib/single-flight";
import { CheckoutSessionForm } from "./checkout-session-form";

type CartViewProps = {
  authenticated: boolean;
};

export function CartView({ authenticated }: CartViewProps) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    queueMicrotask(() => setHydrated(true));
  }, []);
  const cart = useCartStore((state) => state.cart);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const mergeSummary = useCartStore((state) => state.mergeSummary);
  const syncError = useCartStore((state) => state.syncError);
  const clearMergeSummary = useCartStore((state) => state.clearMergeSummary);
  const hydrateCart = useCartStore((state) => state.hydrateCart);
  const setAuthState = useCartStore((state) => state.setAuthState);

  useEffect(() => {
    if (!hydrated) return;
    setAuthState(authenticated);
  }, [authenticated, hydrated, setAuthState]);

  useEffect(() => {
    if (!hydrated || !authenticated) return;

    let active = true;
    const loadServerCart = async () => {
      const payload = await runSingleFlight<{ cart: typeof cart; version: number } | null>(
        "cart-snapshot",
        async () => {
          const response = await fetch("/api/cart", { method: "GET", cache: "no-store" });
          if (!response.ok) return null;
          return (await response.json()) as { cart: typeof cart; version: number };
        },
      );
      if (!active || !payload) return;
      hydrateCart(payload.cart, { version: payload.version });
    };

    void loadServerCart();
    return () => {
      active = false;
    };
  }, [authenticated, hydrateCart, hydrated]);

  const totals = useMemo(() => calculateCartTotals(cart), [cart]);
  const unavailableItems = useMemo(() => getUnavailableCartItems(cart), [cart]);
  const currency = cart.items[0]?.currency ?? "MXN";
  const canCheckout = unavailableItems.length === 0 && totals.itemCount > 0;

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Your cart</h1>
        <div className="animate-pulse space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="rounded-full bg-emerald-50 dark:bg-emerald-950/30 p-6">
          <ShoppingBag className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Your cart is empty</h1>
          <p className="mt-1 text-muted-foreground">
            Browse seeds, grow lights, and supplies to start your indoor garden.
          </p>
        </div>
        <Button asChild>
          <Link href="/catalog">
            Browse the catalog <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border bg-gradient-to-br from-emerald-50/60 via-background to-amber-50/30 p-5 dark:from-emerald-950/20 dark:via-background dark:to-amber-950/10">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
            Checkout ready
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Your grow cart</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review quantities, confirm availability, and continue when your setup looks right.
          </p>
        </div>
        <Badge variant="secondary">
          {totals.itemCount} {totals.itemCount === 1 ? "item" : "items"}
        </Badge>
      </div>

      {/* Alerts */}
      {syncError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{syncError}</AlertDescription>
        </Alert>
      )}

      {mergeSummary.messages.length > 0 && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Cart merge summary</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 list-disc pl-4 space-y-0.5">
              {mergeSummary.messages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
            <Button
              variant="link"
              size="sm"
              className="mt-2 h-auto p-0"
              onClick={clearMergeSummary}
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {unavailableItems.length > 0 && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Some items need attention</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 list-disc pl-4 space-y-0.5">
              {unavailableItems.map((item) => (
                <li key={item.variantId}>
                  <span className="font-medium">{item.name}</span> ({item.variantName}):{" "}
                  {item.unavailableReason}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Cart items */}
        <div className="space-y-3">
          {cart.items.map((item) => (
            <Card key={item.variantId}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Item thumbnail - plant-branded tint */}
                  <div className="h-16 w-16 shrink-0 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100/60 dark:from-emerald-950/30 dark:to-emerald-900/20 flex items-center justify-center">
                    <Sprout className="h-6 w-6 text-emerald-500/50 dark:text-emerald-400/40" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <Link href={item.href} className="font-semibold hover:underline line-clamp-1">
                      {item.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">{item.variantName}</p>
                    <p className="text-sm font-medium mt-0.5">
                      {formatCurrencyFromCents(item.unitPriceCents, item.currency)}
                    </p>
                    {item.unavailableReason && (
                      <Badge variant="warning" className="mt-1 text-xs">
                        {item.unavailableReason}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1 rounded-lg border bg-background">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-r-none"
                        onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        aria-label={`Decrease ${item.name} quantity`}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span
                        className="w-8 text-center text-sm font-medium tabular-nums"
                        data-testid={`cart-qty-${item.variantId}`}
                      >
                        {item.quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-l-none"
                        onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                        disabled={item.quantity >= item.stockOnHand || item.stockOnHand <= 0}
                        aria-label={`Increase ${item.name} quantity`}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(item.variantId)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order summary */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="font-semibold">Order summary</h2>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Shipping and final payment details are confirmed in the next step.
              </p>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items ({totals.itemCount})</span>
                  <span>{formatCurrencyFromCents(totals.subtotalCents, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-muted-foreground">Calculated at checkout</span>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Subtotal</span>
                <span>{formatCurrencyFromCents(totals.subtotalCents, currency)}</span>
              </div>
              <CheckoutSessionForm authenticated={authenticated} canCheckout={canCheckout} />
              <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-primary" aria-hidden="true" />
                  Indoor-grow essentials
                </span>
                <span className="flex items-center gap-1">
                  <Truck className="h-3 w-3 text-primary" aria-hidden="true" />
                  Shipping shown at checkout
                </span>
              </div>
            </CardContent>
          </Card>
          <Button asChild variant="outline" className="w-full">
            <Link href="/catalog">Continue shopping</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
