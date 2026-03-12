import { AccessDenied } from "@/components/admin/access-denied";
import { CsvImportForm } from "@/components/admin/csv-import-form";
import { listAdminCategories } from "@/server/admin/admin-service";
import { getRouteAccess } from "@/server/admin/role-guard";

export default function AdminImportPage() {
  const access = getRouteAccess("import");
  if (!access.allowed) {
    return <AccessDenied role={access.role} section="CSV import" />;
  }

  const categories = listAdminCategories();
  const defaultCategorySlug = categories[0]?.slug ?? "catalog";

  return (
    <main className="space-y-6">
      <CsvImportForm defaultCategorySlug={defaultCategorySlug} />
    </main>
  );
}
