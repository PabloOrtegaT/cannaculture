import Link from "next/link";
import { Plus } from "lucide-react";
import { AccessDenied } from "@/components/admin/access-denied";
import { ProductsTable, VariantsTable } from "@/components/admin/tables";
import { Button } from "@/components/ui/button";
import { listAdminProducts, listAdminVariants } from "@/server/admin/admin-service";
import { getRouteAccess } from "@/server/admin/role-guard";

export default async function AdminProductsPage() {
  const access = await getRouteAccess("products");
  if (!access.allowed) {
    return <AccessDenied role={access.role ?? "unknown"} section="products" />;
  }

  const products = listAdminProducts();
  const variants = listAdminVariants();

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-card p-6 text-card-foreground">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Products</h1>
            <p className="text-sm text-muted-foreground">
              Manage catalog products and variants from dedicated workflows.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/admin/products/new">
                <Plus className="h-4 w-4" />
                New product
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-6 text-card-foreground">
        <h2 className="text-lg font-semibold">Products table</h2>
        <ProductsTable rows={products} />
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-6 text-card-foreground">
        <h2 className="text-lg font-semibold">Variants table</h2>
        <VariantsTable rows={variants} />
      </section>
    </div>
  );
}
