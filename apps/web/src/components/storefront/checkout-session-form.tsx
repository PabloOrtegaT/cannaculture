"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CreditCard, AlertCircle, Lock, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { showClientToast } from "@/components/feedback/client-toast";
import { runSingleFlight } from "@/lib/single-flight";

type CheckoutProviderOption = {
  method: "card" | "mercadopago";
  label: string;
  activeProvider: string;
  mode: "live" | "mock";
};

type CheckoutSessionFormProps = {
  authenticated: boolean;
  canCheckout: boolean;
};

const fallbackOptions: CheckoutProviderOption[] = [
  { method: "card", label: "Card", activeProvider: "mock-card", mode: "mock" },
  {
    method: "mercadopago",
    label: "Mercado Pago",
    activeProvider: "mock-mercadopago",
    mode: "mock",
  },
];

export function CheckoutSessionForm({ authenticated, canCheckout }: CheckoutSessionFormProps) {
  const [provider, setProvider] = useState<CheckoutProviderOption["method"]>("card");
  const [couponCode, setCouponCode] = useState("");
  const [providers, setProviders] = useState<CheckoutProviderOption[]>(fallbackOptions);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const payload = await runSingleFlight<{ providers: CheckoutProviderOption[] } | null>(
          "checkout-provider-options",
          async () => {
            const response = await fetch("/api/checkout/session", {
              method: "GET",
              cache: "no-store",
            });
            if (!response.ok) return null;
            return (await response.json()) as { providers: CheckoutProviderOption[] };
          },
        );
        if (!active || !payload) return;
        if (Array.isArray(payload.providers) && payload.providers.length > 0) {
          setProviders(payload.providers);
        }
      } catch {
        // Keep fallback options.
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, []);

  const selectedProvider = useMemo(
    () => providers.find((entry) => entry.method === provider) ?? providers[0],
    [provider, providers],
  );

  const submitDisabled = !authenticated || !canCheckout || submitting;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitDisabled) return;

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, couponCode: couponCode.trim() || undefined }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
          code?: string;
          lines?: Array<{
            variantId: string;
            requestedQty: number;
            availableQty: number;
            reason: string;
          }>;
        } | null;
        if (response.status === 409 && payload?.code === "insufficient_stock") {
          const lineCount = payload.lines?.length ?? 0;
          const message =
            lineCount > 0
              ? `Stock changed for ${lineCount} item(s). Please review your cart and try again.`
              : "Stock changed. Please review your cart and try again.";
          setError(message);
          showClientToast({ type: "error", code: "insufficient_stock", message });
          return;
        }
        if (response.status === 400 && payload?.code === "invalid_coupon") {
          setError(payload.error ?? "Coupon code is invalid or not applicable.");
          return;
        }
        setError(payload?.error ?? "Could not create checkout session.");
        return;
      }

      const payload = (await response.json()) as { checkoutUrl: string };
      window.location.assign(payload.checkoutUrl);
    } catch {
      setError("Could not create checkout session.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="space-y-3">
        <Separator />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Sign in before checkout</p>
          <p className="text-sm text-muted-foreground">
            Your cart is already saved. Sign in to continue to payment and track your order later.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href="/login?next=/cart">
            <Lock className="h-4 w-4" />
            Sign in to checkout
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <Separator />

      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Checkout details</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Choose how you want to pay and add any coupon code before we send you to the payment step.
        </p>
      </div>

      {/* Payment method */}
      <div className="space-y-1.5">
        <Label htmlFor="payment-provider">Payment method</Label>
        <select
          id="payment-provider"
          value={provider}
          onChange={(event) => setProvider(event.target.value as CheckoutProviderOption["method"])}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          disabled={submitting}
        >
          {providers.map((entry) => (
            <option key={entry.method} value={entry.method}>
              {entry.label}
            </option>
          ))}
        </select>
        {selectedProvider && selectedProvider.mode !== "live" && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Badge variant="secondary" className="text-[10px]">
              Test mode
            </Badge>
            <span>This method is running in a non-live environment.</span>
          </span>
        )}
      </div>

      {/* Coupon */}
      <div className="space-y-1.5">
        <Label htmlFor="coupon-code">Coupon code (optional)</Label>
        <Input
          id="coupon-code"
          value={couponCode}
          onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
          placeholder="SAVE10"
          maxLength={32}
          disabled={submitting}
        />
        <p className="text-[11px] text-muted-foreground">
          We’ll validate your code before creating the checkout session.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={submitDisabled}>
        {submitting ? (
          "Preparing secure checkout..."
        ) : (
          <>
            <Lock className="h-4 w-4" />
            <CreditCard className="h-4 w-4" />
            Proceed to secure payment
          </>
        )}
      </Button>
      <div className="space-y-1 rounded-lg border bg-muted/30 px-3 py-2 text-center">
        <p className="text-[10px] text-muted-foreground leading-relaxed flex items-center justify-center gap-1">
          <ShieldCheck className="h-3 w-3 text-primary shrink-0" aria-hidden="true" />
          Your payment is processed securely. We never store your card details.
        </p>
        <p className="text-[10px] text-muted-foreground">
          Stock is checked before checkout so your order reflects current availability.
        </p>
      </div>
    </form>
  );
}
