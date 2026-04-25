import { Button, Input, Label } from "@cannaculture/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccessDenied } from "@/components/admin/access-denied";
import { VariantsTable } from "@/components/admin/tables";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { VariantAttributeFields } from "@/components/admin/variant-attribute-fields";
import { createVariantAction, updateProductAction } from "@/app/(admin)/admin/actions";
import {
  getAdminProductCategoryAttributeDefinitions,
  listAdminCategories,
  listAdminProducts,
  listAdminVariants,
} from "@/server/admin/admin-service";
import { getRouteAccess } from "@/server/admin/role-guard";

type AdminProductDetailsPageProps = {
  params: Promise<{ productId: string }>;
};

export default async function AdminProductDetailsPage({ params }: AdminProductDetailsPageProps) {
  const access = await getRouteAccess("products");
  if (!access.allowed) {
    return <AccessDenied role={access.role ?? "unknown"} section="products" />;
  }

  const { productId } = await params;
  const categories = listAdminCategories();
  const products = listAdminProducts();
  const variants = listAdminVariants();

  const product = products.find((entry) => entry.id === productId);
  if (!product) {
    notFound();
  }

  const productVariants = variants.filter((variant) => variant.productId === product.id);
  const attributeDefinitions = getAdminProductCategoryAttributeDefinitions(product.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
          <p className="text-sm text-muted-foreground">Edit product details and manage variants.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/products">Back to products</Link>
        </Button>
      </div>

      <section className="rounded-lg border bg-card p-6 text-card-foreground">
        <form action={updateProductAction} className="space-y-4" data-testid="edit-product-form">
          <input type="hidden" name="id" value={product.id} />
          <input type="hidden" name="redirectTo" value={`/admin/products/${product.id}`} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-product-name">Name</Label>
              <Input
                id="edit-product-name"
                type="text"
                name="name"
                defaultValue={product.name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-product-slug">Slug</Label>
              <Input
                id="edit-product-slug"
                type="text"
                name="slug"
                defaultValue={product.slug}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-product-category">Category</Label>
              <Select name="categoryId" required defaultValue={product.categoryId}>
                <SelectTrigger id="edit-product-category">
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
              <Label htmlFor="edit-product-base-sku">Base SKU</Label>
              <Input
                id="edit-product-base-sku"
                type="text"
                name="baseSku"
                defaultValue={product.baseSku}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-product-description">Description</Label>
            <Textarea
              id="edit-product-description"
              name="description"
              defaultValue={product.description}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-product-tags">Tags (comma separated)</Label>
            <Input
              id="edit-product-tags"
              type="text"
              name="tags"
              defaultValue={product.tags.join(",")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="edit-product-price">Price (cents)</Label>
              <Input
                id="edit-product-price"
                type="number"
                min={0}
                name="priceCents"
                defaultValue={product.priceCents}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-product-compare">Compare-at (cents)</Label>
              <Input
                id="edit-product-compare"
                type="number"
                min={0}
                name="compareAtPriceCents"
                defaultValue={product.compareAtPriceCents}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-product-currency">Currency</Label>
              <Select name="currency" defaultValue={product.currency}>
                <SelectTrigger id="edit-product-currency">
                  <SelectValue placeholder="Select a currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MXN">MXN</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-product-status">Status</Label>
            <Select name="status" defaultValue={product.status}>
              <SelectTrigger id="edit-product-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">draft</SelectItem>
                <SelectItem value="active">active</SelectItem>
                <SelectItem value="archived">archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button type="submit">Save product changes</Button>
            <Button variant="outline" asChild>
              <Link href="/admin/products">Cancel</Link>
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border bg-card p-6 text-card-foreground">
        <h2 className="text-lg font-semibold">Create variant</h2>
        <form action={createVariantAction} className="mt-4 space-y-4">
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="redirectTo" value={`/admin/products/${product.id}`} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="create-variant-name">Variant name</Label>
              <Input id="create-variant-name" type="text" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-variant-sku">SKU</Label>
              <Input id="create-variant-sku" type="text" name="sku" required />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="create-variant-price">Price (cents)</Label>
              <Input id="create-variant-price" type="number" min={0} name="priceCents" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-variant-compare">Compare-at (cents)</Label>
              <Input id="create-variant-compare" type="number" min={0} name="compareAtPriceCents" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-variant-stock">Initial stock</Label>
              <Input id="create-variant-stock" type="number" min={0} name="stockOnHand" required />
            </div>
          </div>

          {attributeDefinitions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Attributes</p>
              <VariantAttributeFields definitions={attributeDefinitions} defaultValues={{}} />
            </div>
          )}

          <label className="flex items-center gap-2 text-sm" htmlFor="create-variant-is-default">
            <input id="create-variant-is-default" type="checkbox" name="isDefault" />
            Set as default variant
          </label>

          <Button type="submit">Create variant</Button>
        </form>
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-6 text-card-foreground">
        <h2 className="text-lg font-semibold">Variants for this product</h2>
        <VariantsTable rows={productVariants} />
      </section>
    </div>
  );
}
