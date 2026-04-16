import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Package, User, LogOut, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getSessionUser } from "@/server/auth/session";
import { listOrdersForUser } from "@/server/orders/service";
import { formatCurrencyFromCents } from "@/features/catalog/pricing";
import { createPageMetadata } from "@/server/seo/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Account",
  description: "Account details and session controls.",
  pathname: "/account",
  noIndex: true,
});

const statusVariants: Record<
  string,
  "default" | "secondary" | "success" | "destructive" | "warning" | "outline"
> = {
  pending_payment: "warning",
  processing: "secondary",
  paid: "success",
  completed: "success",
  cancelled: "destructive",
  payment_failed: "destructive",
};

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?next=/account");
  }
  const orders = await listOrdersForUser(user.id);

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">My account</h1>
        <Button asChild variant="ghost" size="sm">
          <Link href="/logout">
            <LogOut className="h-4 w-4" />
            Sign out
          </Link>
        </Button>
      </div>

      {/* Profile card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2.5">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{user.email}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5 capitalize">{user.role} account</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Orders */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Recent orders</h2>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <div className="rounded-full bg-muted p-4">
                <ShoppingBag className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">No orders yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your completed orders will appear here
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/catalog">Start shopping</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {orders.map((entry) => (
              <Card key={entry.order.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-mono font-semibold text-sm">{entry.order.orderNumber}</p>
                        <Badge
                          variant={statusVariants[entry.order.status] ?? "secondary"}
                          className="text-xs"
                        >
                          {entry.order.status.replace(/_/g, " ")}
                        </Badge>
                        <Badge
                          variant={statusVariants[entry.order.paymentStatus] ?? "secondary"}
                          className="text-xs"
                        >
                          {entry.order.paymentStatus.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      {entry.leadItem && (
                        <p className="text-sm text-muted-foreground truncate">
                          {entry.leadItem.name} — {entry.leadItem.variantName}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-sm">
                        {formatCurrencyFromCents(
                          entry.order.totalCents,
                          entry.order.currency as "MXN" | "USD",
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Separator />

      <div className="text-sm text-muted-foreground">
        Need help?{" "}
        <Link href="/catalog" className="text-foreground hover:underline">
          Browse catalog
        </Link>
      </div>
    </div>
  );
}
