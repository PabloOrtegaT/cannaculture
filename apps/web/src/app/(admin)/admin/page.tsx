import Link from "next/link";
import { TrendingUp, Package, ClipboardList, DollarSign } from "lucide-react";
import { AccessDenied } from "@/components/admin/access-denied";
import { DashboardSalesTrendChart } from "@/components/admin/dashboard-sales-chart";
import { formatCurrencyCents } from "@/features/admin/format";
import {
  listAdminDashboardAnalyticsReadModel,
  listAdminOrdersReadModel,
  listAdminVariants,
} from "@/server/admin/admin-service";
import { getRouteAccess } from "@/server/admin/role-guard";
import { getAdminContentSnapshot } from "@/server/data/storefront-service";

const LOW_STOCK_THRESHOLD = 5;

export default async function AdminPage() {
  const access = await getRouteAccess("dashboard");
  if (!access.allowed) {
    return <AccessDenied role={access.role ?? "unknown"} section="dashboard" />;
  }

  const snapshot = getAdminContentSnapshot();
  const [orders, variants] = await Promise.all([listAdminOrdersReadModel(), listAdminVariants()]);
  const analytics = await listAdminDashboardAnalyticsReadModel(orders);

  const totalRevenueCents = analytics.salesTrend.reduce((sum, p) => sum + p.totalCents, 0);
  const paidOrderCount = orders.filter((o) => o.status === "paid").length;
  const pendingOrderCount = orders.filter(
    (o) => o.status === "pending" || o.status === "pending_payment",
  ).length;
  const recentOrders = orders.slice(0, 4);

  const lowStock = variants
    .filter((v) => v.stockOnHand > 0 && v.stockOnHand <= LOW_STOCK_THRESHOLD)
    .sort((left, right) => {
      if (left.stockOnHand !== right.stockOnHand) {
        return left.stockOnHand - right.stockOnHand;
      }
      return `${left.productName}:${left.name}`.localeCompare(`${right.productName}:${right.name}`);
    });
  const outOfStock = variants.filter((v) => v.stockOnHand === 0);

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <p className="text-sm text-muted-foreground">Admin Dashboard</p>
        <h1 className="text-2xl font-bold tracking-tight">Operations overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Active store profile:{" "}
          <span className="font-semibold text-foreground">{snapshot.profile}</span>
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Revenue */}
        <div className="rounded-xl border border-amber-200 bg-stone-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-amber-700 mb-2">
            <DollarSign className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-widest">Total Revenue</p>
          </div>
          <p className="text-3xl font-black text-foreground mb-1">
            {formatCurrencyCents(totalRevenueCents, "MXN")}
          </p>
          <p className="text-xs text-muted-foreground">All-time total</p>
        </div>

        {/* Total orders */}
        <div className="rounded-xl border border-stone-200 bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-stone-600 mb-2">
            <Package className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-widest">Total Orders</p>
          </div>
          <p className="text-3xl font-black text-foreground mb-1">{orders.length}</p>
          <p className="text-xs text-muted-foreground">All statuses</p>
        </div>

        {/* Pending orders */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-amber-700 mb-2">
            <ClipboardList className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-widest">Pending</p>
          </div>
          <p className="text-3xl font-black text-foreground mb-1">{pendingOrderCount}</p>
          <p className="text-xs text-amber-700/80">Awaiting payment or fulfillment</p>
        </div>

        {/* Paid orders */}
        <div className="rounded-xl border border-lime-200 bg-lime-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-lime-700 mb-2">
            <TrendingUp className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-widest">Paid</p>
          </div>
          <p className="text-3xl font-black text-foreground mb-1">{paidOrderCount}</p>
          <p className="text-xs text-lime-700/80">Payment confirmed</p>
        </div>
      </div>

      {/* Low-stock alerts */}
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold mb-4">Inventory alerts</h2>
        <div className="grid gap-3 md:grid-cols-3 mb-5">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-[10px] uppercase tracking-wide text-amber-800 mb-1">Low stock</p>
            <p className="text-2xl font-black text-amber-900">{lowStock.length}</p>
            <p className="text-xs text-amber-800/70">{LOW_STOCK_THRESHOLD} units or fewer</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-[10px] uppercase tracking-wide text-red-800 mb-1">Out of stock</p>
            <p className="text-2xl font-black text-red-900">{outOfStock.length}</p>
            <p className="text-xs text-red-800/70">Zero inventory</p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
              Total SKUs
            </p>
            <p className="text-2xl font-bold">{variants.length}</p>
            <p className="text-xs text-muted-foreground">Active variants</p>
          </div>
        </div>
        {lowStock.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-amber-900">Low-stock items</p>
            <ul className="divide-y rounded-lg border bg-background">
              {lowStock.slice(0, 5).map((variant) => (
                <li
                  key={variant.id}
                  className="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <span className="text-muted-foreground">
                    {variant.productName} — {variant.name}
                  </span>
                  <span className="font-semibold text-amber-700">{variant.stockOnHand} left</span>
                </li>
              ))}
            </ul>
            {lowStock.length > 5 && (
              <p className="text-xs text-muted-foreground">
                and {lowStock.length - 5} more low-stock items
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">All products are currently well-stocked.</p>
        )}
      </section>

      {/* Sales trend chart + recent orders */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <DashboardSalesTrendChart salesTrend={analytics.salesTrend} currency="MXN" />

        {/* Recent orders compact table */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold mb-4">Recent Orders</h2>
          <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 gap-y-0">
            <div className="contents text-[10px] font-semibold uppercase tracking-wider text-muted-foreground pb-2 border-b">
              <span className="pb-2 border-b">Order</span>
              <span className="pb-2 border-b">Product</span>
              <span className="pb-2 border-b">Total</span>
              <span className="pb-2 border-b">Status</span>
            </div>
            {recentOrders.map((order) => (
              <div key={order.id} className="contents text-xs">
                <span className="py-2.5 border-b last:border-0 font-semibold text-primary">
                  {order.orderNumber}
                </span>
                <span className="py-2.5 border-b last:border-0 text-muted-foreground truncate">
                  {order.productLabel}
                </span>
                <span className="py-2.5 border-b last:border-0 font-semibold whitespace-nowrap">
                  {formatCurrencyCents(order.totalCents, order.currency)}
                </span>
                <span className="py-2.5 border-b last:border-0">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      order.status === "paid" || order.status === "shipped"
                        ? "bg-emerald-100 text-emerald-700"
                        : order.status === "cancelled" || order.status === "payment_failed"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {order.status}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Store snapshot + quick links */}
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold mb-4">Store snapshot</h2>
        <div className="grid gap-3 md:grid-cols-3 mb-5">
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
              Active banners
            </p>
            <p className="text-2xl font-bold">{snapshot.banners}</p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
              News posts
            </p>
            <p className="text-2xl font-bold">{snapshot.newsPosts}</p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
              Featured sales
            </p>
            <p className="text-2xl font-bold">{snapshot.featuredSales}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {[
            { href: "/admin/categories", label: "Manage categories" },
            { href: "/admin/products", label: "Manage products" },
            { href: "/admin/content", label: "Manage content" },
            { href: "/admin/coupons", label: "Manage coupons" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
