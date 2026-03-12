import Link from "next/link";
import { AccessDenied } from "@/components/admin/access-denied";
import { AnalyticsCharts } from "@/components/admin/analytics-charts";
import { OrdersTable } from "@/components/admin/tables";
import { listAdminDashboardAnalytics, listAdminOrders } from "@/server/admin/admin-service";
import { getRouteAccess } from "@/server/admin/role-guard";
import { getAdminContentSnapshot } from "@/server/data/storefront-service";

export default function AdminPage() {
  const access = getRouteAccess("dashboard");
  if (!access.allowed) {
    return <AccessDenied role={access.role} section="dashboard" />;
  }

  const snapshot = getAdminContentSnapshot();
  const orders = listAdminOrders();
  const analytics = listAdminDashboardAnalytics();

  return (
    <main className="space-y-6">
      <section className="rounded-lg border bg-card p-6 text-card-foreground">
        <p className="text-sm font-medium text-muted-foreground">Admin Dashboard</p>
        <h1 className="text-2xl font-semibold tracking-tight">Operations overview</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Active store profile: <span className="font-semibold text-foreground">{snapshot.profile}</span>
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <article className="rounded-md border bg-muted p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Active banners</p>
            <p className="mt-1 text-xl font-semibold">{snapshot.banners}</p>
          </article>
          <article className="rounded-md border bg-muted p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">News posts</p>
            <p className="mt-1 text-xl font-semibold">{snapshot.newsPosts}</p>
          </article>
          <article className="rounded-md border bg-muted p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Featured sales</p>
            <p className="mt-1 text-xl font-semibold">{snapshot.featuredSales}</p>
          </article>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Link href="/admin/products" className="rounded-md border px-3 py-1 hover:bg-muted">
            Manage products
          </Link>
          <Link href="/admin/content" className="rounded-md border px-3 py-1 hover:bg-muted">
            Manage content
          </Link>
          <Link href="/admin/coupons" className="rounded-md border px-3 py-1 hover:bg-muted">
            Manage coupons
          </Link>
          <Link href="/admin/import" className="rounded-md border px-3 py-1 hover:bg-muted">
            Run CSV import
          </Link>
        </div>
      </section>

      <AnalyticsCharts salesTrend={analytics.salesTrend} topProducts={analytics.topProducts} orderStatus={analytics.orderStatus} />

      <section className="space-y-3 rounded-lg border bg-card p-6 text-card-foreground">
        <h2 className="text-lg font-semibold">Orders table</h2>
        <OrdersTable rows={orders} />
      </section>
    </main>
  );
}
