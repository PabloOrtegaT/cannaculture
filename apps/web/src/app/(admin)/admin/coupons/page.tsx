import { AccessDenied } from "@/components/admin/access-denied";
import { CouponsTable } from "@/components/admin/tables";
import { createCouponAction, setCouponActiveAction } from "@/app/(admin)/admin/actions";
import { listAdminCoupons } from "@/server/admin/admin-service";
import { getRouteAccess } from "@/server/admin/role-guard";

const defaultStartsAt = "2026-03-01T00:00:00.000Z";
const defaultEndsAt = "2026-12-31T23:59:59.000Z";

export default function AdminCouponsPage() {
  const access = getRouteAccess("coupons");
  if (!access.allowed) {
    return <AccessDenied role={access.role} section="coupon management" />;
  }

  const coupons = listAdminCoupons();

  return (
    <main className="space-y-6">
      <section className="grid gap-4 rounded-lg border bg-card p-6 text-card-foreground lg:grid-cols-2">
        <form action={createCouponAction} className="space-y-2 rounded-md border bg-muted p-3">
          <h1 className="text-lg font-semibold">Create coupon</h1>
          <p className="text-xs text-muted-foreground">
            Coupon discount is applied to products subtotal only. Shipping is excluded.
          </p>
          <input
            type="text"
            name="code"
            placeholder="Code (e.g. SPRING15)"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm uppercase"
            required
          />
          <select name="type" className="w-full rounded-md border bg-background px-3 py-2 text-sm" defaultValue="percentage">
            <option value="percentage">percentage</option>
            <option value="fixed">fixed</option>
          </select>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="number"
              name="percentageOff"
              min={1}
              max={100}
              placeholder="percentageOff"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            <input
              type="number"
              name="amountOffCents"
              min={1}
              placeholder="amountOffCents"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <select name="currency" className="w-full rounded-md border bg-background px-3 py-2 text-sm" defaultValue="MXN">
            <option value="MXN">MXN</option>
            <option value="USD">USD</option>
          </select>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="text"
              name="startsAt"
              defaultValue={defaultStartsAt}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              required
            />
            <input
              type="text"
              name="endsAt"
              defaultValue={defaultEndsAt}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              required
            />
          </div>
          <input
            type="number"
            name="usageLimit"
            min={1}
            placeholder="usageLimit (optional)"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked />
            Active
          </label>
          <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
            Create coupon
          </button>
        </form>

        <form action={setCouponActiveAction} className="space-y-2 rounded-md border bg-muted p-3">
          <h2 className="text-lg font-semibold">Toggle coupon active state</h2>
          <select name="couponId" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            {coupons.map((coupon) => (
              <option key={coupon.id} value={coupon.id}>
                {coupon.code}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked />
            Active
          </label>
          <button type="submit" className="rounded-md border px-3 py-2 text-sm hover:bg-background">
            Apply coupon state
          </button>
        </form>
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-6 text-card-foreground">
        <h2 className="text-lg font-semibold">Coupons table</h2>
        <CouponsTable rows={coupons} />
      </section>
    </main>
  );
}
