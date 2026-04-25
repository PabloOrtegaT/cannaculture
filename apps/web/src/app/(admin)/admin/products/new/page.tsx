import { Button, Input, Label } from "@cannaculture/ui";
import Link from "next/link";
import { AccessDenied } from "@/components/admin/access-denied";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createProductAction } from "@/app/(admin)/admin/actions";
import { listAdminCategories } from "@/server/admin/admin-service";
import { getRouteAccess } from "@/server/admin/role-guard";

export default async function AdminNewProductPage() {
  const access = await getRouteAccess("products");
  if (!access.allowed) {
    return <AccessDenied role={access.role ?? "unknown"} section="products" />;
  }

  const categories = listAdminCategories();
  const defaultCategoryId = categories[0]?.id ?? "";

  if (categories.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create product</h1>
          <p className="text-sm text-muted-foreground">
            You need at least one category before creating products.
          </p>
        </div>
        <section className="rounded-lg border bg-card p-6 text-card-foreground">
          <p className="text-sm text-muted-foreground">No categories available yet.</p>
          <div className="mt-4">
            <Button asChild>
              <Link href="/admin/categories">Create a category first</Link>
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create product</h1>
        <p className="text-sm text-muted-foreground">
          Start a new product and initialize its default variant stock.
        </p>
      </div>

      <section className="rounded-lg border bg-card p-6 text-card-foreground">
        <form action={createProductAction} className="space-y-4" data-testid="create-product-form">
          <input type="hidden" name="redirectTo" value="/admin/products" />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="create-product-name">Name</Label>
              <Input id="create-product-name" type="text" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-product-slug">Slug</Label>
              <Input id="create-product-slug" type="text" name="slug" required />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="create-product-category">Category</Label>
              <Select name="categoryId" required defaultValue={defaultCategoryId}>
                <SelectTrigger id="create-product-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-product-base-sku">Base SKU</Label>
              <Input id="create-product-base-sku" type="text" name="baseSku" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-product-description">Description</Label>
            <Textarea id="create-product-description" name="description" rows={3} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-product-tags">Tags (comma separated)</Label>
            <Input
              id="create-product-tags"
              type="text"
              name="tags"
              placeholder="featured,new-arrival"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="create-product-price">Price (cents)</Label>
              <Input id="create-product-price" type="number" min={0} name="priceCents" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-product-compare">Compare-at (cents)</Label>
              <Input id="create-product-compare" type="number" min={0} name="compareAtPriceCents" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="create-product-stock">Initial stock</Label>
              <Input id="create-product-stock" type="number" min={0} name="stockOnHand" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-product-currency">Currency</Label>
              <Select name="currency" defaultValue="MXN">
                <SelectTrigger id="create-product-currency">
                  <SelectValue placeholder="Select a currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MXN">MXN</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-product-status">Status</Label>
              <Select name="status" defaultValue="active">
                <SelectTrigger id="create-product-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">draft</SelectItem>
                  <SelectItem value="active">active</SelectItem>
                  <SelectItem value="archived">archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit">Create product</Button>
            <Button variant="outline" asChild>
              <Link href="/admin/products">Cancel</Link>
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
