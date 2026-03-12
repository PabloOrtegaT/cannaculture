import { AccessDenied } from "@/components/admin/access-denied";
import { ContentTable } from "@/components/admin/tables";
import {
  createFeaturedSaleAction,
  createNewsPostAction,
  createPromoBannerAction,
  setFeaturedSaleActiveAction,
  setNewsStatusAction,
  setPromoBannerActiveAction,
} from "@/app/(admin)/admin/actions";
import {
  listAdminContentRows,
  listAdminFeaturedSales,
  listAdminNewsPosts,
  listAdminProducts,
  listAdminPromoBanners,
} from "@/server/admin/admin-service";
import { getRouteAccess } from "@/server/admin/role-guard";

const defaultStartsAt = "2026-03-01T00:00:00.000Z";
const defaultEndsAt = "2026-12-31T23:59:59.000Z";

export default function AdminContentPage() {
  const access = getRouteAccess("content");
  if (!access.allowed) {
    return <AccessDenied role={access.role} section="content management" />;
  }

  const contentRows = listAdminContentRows();
  const newsPosts = listAdminNewsPosts();
  const promoBanners = listAdminPromoBanners();
  const featuredSales = listAdminFeaturedSales();
  const products = listAdminProducts();

  return (
    <main className="space-y-6">
      <section className="grid gap-4 rounded-lg border bg-card p-6 text-card-foreground lg:grid-cols-2">
        <form action={createNewsPostAction} className="space-y-2 rounded-md border bg-muted p-3">
          <h1 className="text-lg font-semibold">Create news post</h1>
          <input
            type="text"
            name="title"
            placeholder="Title"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          />
          <input
            type="text"
            name="summary"
            placeholder="Summary (10+ chars)"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          />
          <textarea
            name="body"
            placeholder="Body (60+ chars)"
            className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          />
          <select name="status" className="w-full rounded-md border bg-background px-3 py-2 text-sm" defaultValue="draft">
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
          <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
            Create news post
          </button>
        </form>

        <form action={setNewsStatusAction} className="space-y-2 rounded-md border bg-muted p-3">
          <h2 className="text-lg font-semibold">Update news status</h2>
          <select name="newsId" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            {newsPosts.map((news) => (
              <option key={news.id} value={news.id}>
                {news.title}
              </option>
            ))}
          </select>
          <select name="status" className="w-full rounded-md border bg-background px-3 py-2 text-sm" defaultValue="published">
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
          <button type="submit" className="rounded-md border px-3 py-2 text-sm hover:bg-background">
            Apply news status
          </button>
        </form>
      </section>

      <section className="grid gap-4 rounded-lg border bg-card p-6 text-card-foreground lg:grid-cols-2">
        <form action={createPromoBannerAction} className="space-y-2 rounded-md border bg-muted p-3">
          <h2 className="text-lg font-semibold">Create promo banner</h2>
          <input
            type="text"
            name="title"
            placeholder="Title"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          />
          <input
            type="text"
            name="subtitle"
            placeholder="Subtitle"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          <input type="text" name="ctaLabel" placeholder="CTA label" className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
          <input type="text" name="ctaHref" placeholder="CTA href" className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
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
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked />
            Active
          </label>
          <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
            Create banner
          </button>
        </form>

        <form action={setPromoBannerActiveAction} className="space-y-2 rounded-md border bg-muted p-3">
          <h2 className="text-lg font-semibold">Toggle banner active state</h2>
          <select name="bannerId" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            {promoBanners.map((banner) => (
              <option key={banner.id} value={banner.id}>
                {banner.title}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked />
            Active
          </label>
          <button type="submit" className="rounded-md border px-3 py-2 text-sm hover:bg-background">
            Apply banner state
          </button>
        </form>
      </section>

      <section className="grid gap-4 rounded-lg border bg-card p-6 text-card-foreground lg:grid-cols-2">
        <form action={createFeaturedSaleAction} className="space-y-2 rounded-md border bg-muted p-3">
          <h2 className="text-lg font-semibold">Create featured sale block</h2>
          <input
            type="text"
            name="title"
            placeholder="Title"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          />
          <input
            type="text"
            name="description"
            placeholder="Description"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
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
          <label className="block text-xs font-medium text-muted-foreground" htmlFor="featured-product-ids">
            Product IDs (comma-separated)
          </label>
          <input
            id="featured-product-ids"
            type="text"
            name="productIds"
            defaultValue={products.map((product) => product.id).join(",")}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked />
            Active
          </label>
          <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
            Create featured block
          </button>
        </form>

        <form action={setFeaturedSaleActiveAction} className="space-y-2 rounded-md border bg-muted p-3">
          <h2 className="text-lg font-semibold">Toggle featured sale state</h2>
          <select name="featuredSaleId" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            {featuredSales.map((featured) => (
              <option key={featured.id} value={featured.id}>
                {featured.title}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked />
            Active
          </label>
          <button type="submit" className="rounded-md border px-3 py-2 text-sm hover:bg-background">
            Apply featured state
          </button>
        </form>
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-6 text-card-foreground">
        <h2 className="text-lg font-semibold">Content entries table</h2>
        <ContentTable rows={contentRows} />
      </section>
    </main>
  );
}
