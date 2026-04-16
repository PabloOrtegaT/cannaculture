import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
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
    <main className="mx-auto w-full max-w-2xl space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Payment not completed</h1>
      <p className="text-sm text-muted-foreground">
        You can review your cart and retry checkout when ready.
      </p>
      {orderReference && (
        <p className="text-sm text-muted-foreground">Order reference: {orderReference}</p>
      )}
      {orderSummary && (
        <Card>
          <CardContent className="p-4 space-y-2">
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
      <div className="flex flex-wrap gap-3">
        <Link href="/cart" className="rounded-md border px-3 py-2 text-sm hover:bg-muted">
          Return to cart
        </Link>
        <Link href="/account" className="rounded-md border px-3 py-2 text-sm hover:bg-muted">
          View account orders
        </Link>
      </div>
    </main>
  );
}
