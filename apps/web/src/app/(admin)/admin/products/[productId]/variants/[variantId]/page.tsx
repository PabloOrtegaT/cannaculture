import { Button, Input, Label } from "@cannaculture/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccessDenied } from "@/components/admin/access-denied";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VariantAttributeFields } from "@/components/admin/variant-attribute-fields";
import { updateVariantAction } from "@/app/(admin)/admin/actions";
import {
  getAdminProductCategoryAttributeDefinitions,
  listAdminProducts,
  listAdminVariants,
} from "@/server/admin/admin-service";
import { getRouteAccess } from "@/server/admin/role-guard";

type AdminVariantDetailsPageProps = {
  params: Promise<{
    productId: string;
    variantId: string;
  }>;
};

export default async function AdminVariantDetailsPage({ params }: AdminVariantDetailsPageProps) {
  const access = await getRouteAccess("products");
  if (!access.allowed) {
    return <AccessDenied role={access.role ?? "unknown"} section="products" />;
  }

  const { productId, variantId } = await params;
  const products = listAdminProducts();
  const variants = listAdminVariants();

  const product = products.find((entry) => entry.id === productId);
  const variant = variants.find((entry) => entry.id === variantId && entry.productId === productId);

  if (!product || !variant) {
    notFound();
  }

  const attributeDefinitions = getAdminProductCategoryAttributeDefinitions(product.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit variant</h1>
          <p className="text-sm text-muted-foreground">
            {product.name} — {variant.name}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/admin/products/${product.id}`}>Back to product</Link>
        </Button>
      </div>

      <section className="rounded-lg border bg-card p-6 text-card-foreground">
        <form action={updateVariantAction} className="space-y-4">
          <input type="hidden" name="id" value={variant.id} />
          <input type="hidden" name="productId" value={product.id} />
          <input
            type="hidden"
            name="redirectTo"
            value={`/admin/products/${product.id}/variants/${variant.id}`}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-variant-name">Variant name</Label>
              <Input
                id="edit-variant-name"
                type="text"
                name="name"
                defaultValue={variant.name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-variant-sku">SKU</Label>
              <Input
                id="edit-variant-sku"
                type="text"
                name="sku"
                defaultValue={variant.sku}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="edit-variant-price">Price (cents)</Label>
              <Input
                id="edit-variant-price"
                type="number"
                min={0}
                name="priceCents"
                defaultValue={variant.priceCents}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-variant-compare">Compare-at (cents)</Label>
              <Input
                id="edit-variant-compare"
                type="number"
                min={0}
                name="compareAtPriceCents"
                defaultValue={variant.compareAtPriceCents}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-variant-stock-mode">Stock mode</Label>
              <Select name="stockMode" defaultValue="set">
                <SelectTrigger id="edit-variant-stock-mode">
                  <SelectValue placeholder="Select stock mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="set">Set exact stock</SelectItem>
                  <SelectItem value="adjust">Adjust by delta (+/-)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-variant-stock-value">Stock value</Label>
              <Input
                id="edit-variant-stock-value"
                type="number"
                name="stockValue"
                defaultValue={variant.stockOnHand}
                required
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Current stock:{" "}
            <span className="font-medium text-foreground">{variant.stockOnHand}</span>. Use
            <span className="font-medium"> set </span>to replace or
            <span className="font-medium"> adjust </span>to add/remove units.
          </p>

          {attributeDefinitions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Attributes</p>
              <VariantAttributeFields
                definitions={attributeDefinitions}
                defaultValues={variant.attributeValues}
              />
            </div>
          )}

          <label className="flex items-center gap-2 text-sm" htmlFor="edit-variant-is-default">
            <input
              id="edit-variant-is-default"
              type="checkbox"
              name="isDefault"
              defaultChecked={variant.isDefault}
            />
            Set as default variant
          </label>

          <div className="flex gap-2">
            <Button type="submit">Save variant changes</Button>
            <Button variant="outline" asChild>
              <Link href={`/admin/products/${product.id}`}>Cancel</Link>
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
