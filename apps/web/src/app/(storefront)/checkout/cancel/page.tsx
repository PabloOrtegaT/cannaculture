import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { ArrowLeft, RefreshCw, XCircle, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrencyFromCents } from "@/features/catalog/pricing";
import { getSessionUser } from "@/server/auth/session";
import { getOrderSummaryForUser } from "@/server/orders/service";
import { createPageMetadata } from "@/server/seo/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Checkout Cancelled",
  description: "Payment was cancelled or failed.",
  pathname: "/checkout/cancel",
  noIndex: true,
});

type CheckoutCancelPageProps = {
  searchParams?: Promise<{
    order?: string;
  }>;
};

export default async function CheckoutCancelPage({ searchParams }: CheckoutCancelPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const parsedOrderId = z.string().uuid().safeParse(params?.order);
  const orderId = parsedOrderId.success ? parsedOrderId.data : undefined;
  const user = await getSessionUser();
  const orderSummary =
    user && orderId ? await getOrderSummaryForUser({ userId: user.id, orderId }) : null;
  const orderReference = orderSummary?.order.orderNumber ?? orderId;

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center text-center space-y-6 py-16">
      <div className="rounded-full bg-amber-50 dark:bg-amber-950/30 p-4">
        <XCircle className="h-8 w-8 text-amber-600" aria-hidden="true" />
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">
          Checkout paused
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Payment not completed</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Your items were not charged. Review your cart, adjust anything you need, and return to
          checkout when you’re ready.
        </p>
      </div>

      {orderReference && (
        <p className="text-xs text-muted-foreground">
          Order reference: <span className="font-mono">{orderReference}</span>
        </p>
      )}

      {orderSummary && (
        <Card className="w-full max-w-md text-left">
          <CardContent className="p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Saved order snapshot
            </p>
            {orderSummary.leadItem && (
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/30 p-2 shrink-0">
                  <Sprout className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                </div>
                <p className="text-sm text-muted-foreground text-left truncate">
                  {orderSummary.leadItem.name} - {orderSummary.leadItem.variantName}
                </p>
              </div>
            )}
            <p className="text-sm font-semibold">
              {formatCurrencyFromCents(
                orderSummary.order.totalCents,
                orderSummary.order.currency as "MXN" | "USD",
              )}
            </p>
            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              Your cart is still available, so you can retry checkout without starting over.
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid w-full max-w-md gap-3 rounded-xl border bg-card p-4 text-left sm:grid-cols-2">
        <div className="rounded-lg bg-muted/30 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <RefreshCw className="h-4 w-4 text-primary" aria-hidden="true" />
            Retry checkout
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Return to your cart and choose the same or a different payment method.
          </p>
        </div>
        <div className="rounded-lg bg-muted/30 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <ArrowLeft className="h-4 w-4 text-primary" aria-hidden="true" />
            Keep browsing
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            You can continue shopping and come back to checkout later.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/cart">Return to cart</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/catalog">Continue shopping</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/account">View account orders</Link>
        </Button>
      </div>
    </div>
  );
}
