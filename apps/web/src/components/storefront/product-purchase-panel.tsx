"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  ArrowRight,
  Minus,
  Plus,
  Truck,
  ShieldCheck,
  Headset,
  Lock,
  Lightbulb,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { showClientToast } from "@/components/feedback/client-toast";
import { calculateCartTotals } from "@/features/cart/cart";
import { useCartStore } from "@/features/cart/cart-store";
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
  defaultVariantId?: string | undefined;
};

type VariantAvailability = {
  variantId: string;
  stockOnHand: number;
  isPurchasable: boolean;
  reason?: string;
};

export function ProductPurchasePanel({
  productId,
  productName,
  categorySlug,
  productSlug,
  currency,
  variants,
  defaultVariantId,
}: ProductPurchasePanelProps) {
  const addItem = useCartStore((state) => state.addItem);
  const initialVariantId = defaultVariantId ?? variants[0]?.id ?? "";
  const initialStock = variants.find((v) => v.id === initialVariantId)?.stockOnHand ?? 0;
  const [userSelectedVariantId, setUserSelectedVariantId] = useState<string | null>(null);
  const selectedVariantId = useMemo(() => {
    const candidate = userSelectedVariantId ?? defaultVariantId ?? variants[0]?.id ?? "";
    const isValid = variants.some((v) => v.id === candidate);
    return isValid ? candidate : (variants[0]?.id ?? "");
  }, [userSelectedVariantId, defaultVariantId, variants]);
  const [quantity, setQuantity] = useState(initialStock > 0 ? 1 : 0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [availability, setAvailability] = useState<VariantAvailability | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const variantSelectId = useId();
  const quantityLabelId = useId();
  const prevResolvedStockRef = useRef<number | null>(null);

  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === selectedVariantId) ?? variants[0] ?? null,
    [selectedVariantId, variants],
  );

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const run = async () => {
      setIsCheckingAvailability(true);
      try {
        const url = new URL("/api/catalog/availability", window.location.origin);
        url.searchParams.set("variantId", selectedVariantId);
        const response = await fetch(url, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          if (active) setAvailability(null);
          return;
        }
        const raw = await response.json();
        if (
          raw &&
          typeof raw === "object" &&
          typeof raw.variantId === "string" &&
          typeof raw.stockOnHand === "number" &&
          Number.isFinite(raw.stockOnHand) &&
          typeof raw.isPurchasable === "boolean" &&
          (raw.reason === undefined || typeof raw.reason === "string")
        ) {
          if (active) {
            setAvailability(raw as VariantAvailability);
          }
        } else {
          if (active) setAvailability(null);
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        if (active) setAvailability(null);
      } finally {
        if (active) setIsCheckingAvailability(false);
      }
    };
    void run();
    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedVariantId]);

  useEffect(() => {
    if (!selectedVariant) return;
    const resolvedStock =
      availability && availability.variantId === selectedVariant.id
        ? availability.stockOnHand
        : selectedVariant.stockOnHand;
    if (prevResolvedStockRef.current === resolvedStock) return;
    prevResolvedStockRef.current = resolvedStock;
    setQuantity((current) => {
      const max = Math.max(0, resolvedStock);
      if (max <= 0) return 0;
      return Math.max(1, Math.min(current, max));
    });
  }, [availability, selectedVariant]);

  if (!selectedVariant) {
    return (
      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">No variants configured yet.</p>
        </CardContent>
      </Card>
    );
  }

  const price = getPriceDisplay(selectedVariant.priceCents, selectedVariant.compareAtPriceCents);
  const resolvedAvailability: VariantAvailability =
    availability && availability.variantId === selectedVariant.id
      ? availability
      : {
          variantId: selectedVariant.id,
          stockOnHand: selectedVariant.stockOnHand,
          isPurchasable: selectedVariant.stockOnHand > 0,
        };
  const resolvedStock = resolvedAvailability.stockOnHand;
  const isOutOfStock = !resolvedAvailability.isPurchasable || resolvedStock <= 0;
  const canAddToCart = !isOutOfStock && !isCheckingAvailability && quantity <= resolvedStock;

  const onAddToCart = () => {
    if (!canAddToCart) {
      const message = resolvedAvailability.reason ?? "This item is no longer available.";
      setFeedback(message);
      showClientToast({ type: "error", code: "out_of_stock", message });
      return;
    }
    addItem(
      {
        productId,
        variantId: selectedVariant.id,
        name: productName,
        variantName: selectedVariant.name,
        href: `/catalog/${categorySlug}/${productSlug}`,
        currency,
        unitPriceCents: selectedVariant.priceCents,
        stockOnHand: resolvedStock,
      },
      quantity,
    );
    const totals = calculateCartTotals(useCartStore.getState().cart);
    const itemWord = totals.itemCount === 1 ? "item" : "items";
    setFeedback(`Added! You now have ${totals.itemCount} ${itemWord} in your cart.`);
  };

  return (
    <Card className="sticky top-20">
      <CardContent className="p-5 space-y-5">
        {/* Price + stock */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">
              {formatCurrencyFromCents(price.currentCents, currency)}
            </span>
            {price.hasDiscount && (
              <>
                <span className="text-muted-foreground line-through text-sm">
                  {formatCurrencyFromCents(price.compareAtCents ?? 0, currency)}
                </span>
                <Badge variant="default">Save {price.discountPercent}%</Badge>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isCheckingAvailability ? (
              <Badge variant="secondary" data-testid="stock-status">
                Checking availability...
              </Badge>
            ) : isOutOfStock ? (
              <Badge variant="destructive" data-testid="stock-status">
                Out of stock
              </Badge>
            ) : resolvedStock <= 5 ? (
              <Badge variant="warning" data-testid="stock-status">
                Only {resolvedStock} left - order soon
              </Badge>
            ) : (
              <Badge variant="success" data-testid="stock-status" className="gap-1">
                <Check className="h-3 w-3" aria-hidden="true" />
                In stock now
              </Badge>
            )}
          </div>
          {resolvedAvailability.reason && (
            <p className="text-xs text-muted-foreground">{resolvedAvailability.reason}</p>
          )}
        </div>

        <Separator />

        {/* Variant selection */}
        {variants.length > 1 && (
          <div className="space-y-1.5">
            <Label htmlFor={variantSelectId}>Select option</Label>
            <Select
              value={selectedVariant.id}
              onValueChange={(value) => {
                setUserSelectedVariantId(value);
                const nextStock = variants.find((v) => v.id === value)?.stockOnHand ?? 0;
                setQuantity(nextStock > 0 ? 1 : 0);
                setAvailability(null);
                setFeedback(null);
              }}
            >
              <SelectTrigger id={variantSelectId} className="w-full">
                <SelectValue placeholder="Choose an option" />
              </SelectTrigger>
              <SelectContent>
                {variants.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Quantity */}
        <div className="space-y-1.5">
          <div id={quantityLabelId} className="text-sm font-medium">
            Quantity
          </div>
          <div
            className="flex items-center gap-1 w-fit rounded-lg border bg-background"
            aria-labelledby={quantityLabelId}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-r-none"
              onClick={() => setQuantity((q) => Math.max(0, q - 1))}
              disabled={quantity <= 0 || isOutOfStock}
              aria-label="Decrease quantity"
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span
              className="w-10 text-center text-sm font-medium tabular-nums"
              aria-live="polite"
              aria-atomic="true"
            >
              {quantity}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-l-none"
              onClick={() => setQuantity((q) => Math.min(q + 1, Math.max(0, resolvedStock)))}
              disabled={quantity >= resolvedStock || isOutOfStock}
              aria-label="Increase quantity"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button
            className="w-full"
            size="lg"
            onClick={onAddToCart}
            disabled={!canAddToCart}
            data-testid="add-to-cart"
          >
            <ShoppingCart className="h-4 w-4" />
            {isOutOfStock ? "Out of stock" : "Add to cart"}
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/cart">
              View cart <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <p
          className={`text-sm text-muted-foreground text-center min-h-[1.25rem] ${
            feedback ? "" : "invisible"
          }`}
          aria-live="polite"
        >
          {feedback ?? " "}
        </p>

        {/* Beginner tip bar */}
        <div className="flex items-start gap-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-800/30 px-3.5 py-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
            <Lightbulb className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">
            <span className="font-medium text-foreground">Grower tip:</span>{" "}
            Not sure which option to pick? Start with the default - our most popular
            choice for indoor setups.
          </p>
        </div>

        {/* Trust / confidence grid */}
        <Separator />
        <div className="grid grid-cols-2 gap-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <Truck className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
            <span>Shipping at checkout</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
            <span>Indoor-grow picks</span>
          </div>
          <div className="flex items-center gap-2">
            <Headset className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
            <span>Buying guidance</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
            <span>Secure checkout</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
