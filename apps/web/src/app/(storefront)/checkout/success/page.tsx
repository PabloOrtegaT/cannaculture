import { Badge, Button, Card, CardContent } from "@cannaculture/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { CheckCircle2, Package, ArrowRight } from "lucide-react";
import { formatCurrencyFromCents } from "@/features/catalog/pricing";
import { getSessionUser } from "@/server/auth/session";
import { getOrderSummaryForUser } from "@/server/orders/service";
import { createPageMetadata } from "@/server/seo/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Checkout Success",
  description: "Payment completed successfully.",
  pathname: "/checkout/success",
  noIndex: true,
});

type CheckoutSuccessPageProps = {
  searchParams?: Promise<{
    order?: string;
  }>;
};

export default async function CheckoutSuccessPage({ searchParams }: CheckoutSuccessPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const parsedOrderId = z.string().uuid().safeParse(params?.order);
  const orderId = parsedOrderId.success ? parsedOrderId.data : undefined;
  const user = await getSessionUser();
  const orderSummary =
    user && orderId ? await getOrderSummaryForUser({ userId: user.id, orderId }) : null;
  const orderReference = orderSummary?.order.orderNumber ?? orderId;

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-6">
      <div className="rounded-full bg-emerald-100 p-5 dark:bg-emerald-950/40">
        <CheckCircle2 className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Payment successful!</h1>
        <p className="text-muted-foreground max-w-sm">
          Your order has been recorded and is now being processed.
        </p>
      </div>

      {orderReference && (
        <Card className="max-w-xs w-full">
          <CardContent className="p-4 flex items-center gap-3">
            <Package className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="text-left min-w-0">
              <p className="text-xs text-muted-foreground">Order reference:</p>
              <p className="text-sm font-mono font-medium truncate">{orderReference}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {orderSummary && (
        <Card className="max-w-md w-full">
          <CardContent className="p-4 space-y-2 text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="success" className="text-xs">
                {orderSummary.order.status.replace(/_/g, " ")}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {orderSummary.order.paymentStatus.replace(/_/g, " ")}
              </Badge>
            </div>
            {orderSummary.leadItem && (
              <p className="text-sm text-muted-foreground">
                {orderSummary.leadItem.name} — {orderSummary.leadItem.variantName}
              </p>
            )}
            <p className="text-sm font-semibold">
              {formatCurrencyFromCents(
                orderSummary.order.totalCents,
                orderSummary.order.currency as "MXN" | "USD",
              )}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3 justify-center">
        <Button asChild>
          <Link href="/account">
            View my orders <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/catalog">Continue shopping</Link>
        </Button>
      </div>
    </div>
  );
}
