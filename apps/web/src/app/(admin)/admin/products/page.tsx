import Link from "next/link";
import { AccessDenied } from "@/components/admin/access-denied";
import { ProductsTable, VariantsTable } from "@/components/admin/tables";
import {
  createProductAction,
  createVariantAction,
  updateProductAction,
  updateVariantAction,
} from "@/app/(admin)/admin/actions";
import { listAdminCategories, listAdminProducts, listAdminVariants } from "@/server/admin/admin-service";
import { getRouteAccess } from "@/server/admin/role-guard";

type AdminProductsPageProps = {
  searchParams?: Promise<{
    editProduct?: string;
    editVariant?: string;
  }>;
};

export default async function AdminProductsPage({ searchParams }: AdminProductsPageProps) {
  const access = await getRouteAccess("products");
  if (!access.allowed) {
    return <AccessDenied role={access.role ?? "unknown"} section="products" />;
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const categories = listAdminCategories();
  const products = listAdminProducts();
  const variants = listAdminVariants();

  const selectedProductForEdit = products.find((product) => product.id === resolvedSearchParams?.editProduct);
  const selectedVariantForEdit = variants.find((variant) => variant.id === resolvedSearchParams?.editVariant);

  return (
    <main className="space-y-6">
      <section className="grid gap-4 rounded-lg border bg-card p-6 text-card-foreground lg:grid-cols-2">
        <form action={createProductAction} className="space-y-3 rounded-md border bg-muted p-3" data-testid="create-product-form">
          <h1 className="text-xl font-semibold">Create product</h1>
          <label className="block text-xs font-medium text-muted-foreground" htmlFor="create-product-name">
            Name
          </label>
          <input
            id="create-product-name"
            type="text"
            name="name"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          />
          <label className="block text-xs font-medium text-muted-foreground" htmlFor="create-product-slug">
            Slug
          </label>
          <input
            id="create-product-slug"
            type="text"
            name="slug"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          />
          <label className="block text-xs font-medium text-muted-foreground" htmlFor="create-product-category">
            Category
          </label>
          <select id="create-product-category" name="categoryId" className="w-full rounded-md border bg-background px-3 py-2 text-sm" required>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <label className="block text-xs font-medium text-muted-foreground" htmlFor="create-product-base-sku">
            Base SKU
          </label>
          <input
            id="create-product-base-sku"
            type="text"
            name="baseSku"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          />
          <label className="block text-xs font-medium text-muted-foreground" htmlFor="create-product-description">
            Description
          </label>
          <textarea
            id="create-product-description"
            name="description"
            rows={3}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          <label className="block text-xs font-medium text-muted-foreground" htmlFor="create-product-tags">
            Tags (comma separated)
          </label>
          <input
            id="create-product-tags"
            type="text"
            name="tags"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="featured,new-arrival"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-muted-foreground" htmlFor="create-product-price">
                Price (cents)
              </label>
              <input
                id="create-product-price"
                type="number"
                min={0}
                name="priceCents"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground" htmlFor="create-product-compare">
                Compare-at (cents)
              </label>
              <input
                id="create-product-compare"
                type="number"
                min={0}
                name="compareAtPriceCents"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-muted-foreground" htmlFor="create-product-stock">
                Initial stock
              </label>
              <input
                id="create-product-stock"
                type="number"
                min={0}
                name="stockOnHand"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground" htmlFor="create-product-currency">
                Currency
              </label>
              <select
                id="create-product-currency"
                name="currency"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                defaultValue="MXN"
              >
                <option value="MXN">MXN</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
          <label className="block text-xs font-medium text-muted-foreground" htmlFor="create-product-status">
            Status
          </label>
          <select
            id="create-product-status"
            name="status"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            defaultValue="active"
          >
            <option value="draft">draft</option>
            <option value="active">active</option>
            <option value="archived">archived</option>
          </select>
          <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
            Create product
          </button>
        </form>

        {selectedProductForEdit ? (
          <form
            action={updateProductAction}
            className="space-y-3 rounded-md border bg-muted p-3"
            data-testid="edit-product-form"
          >
            <h2 className="text-lg font-semibold">Edit product</h2>
            <input type="hidden" name="id" value={selectedProductForEdit.id} />
            <label className="block text-xs font-medium text-muted-foreground" htmlFor="edit-product-name">
              Name
            </label>
            <input
              id="edit-product-name"
              type="text"
              name="name"
              defaultValue={selectedProductForEdit.name}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              required
            />
            <label className="block text-xs font-medium text-muted-foreground" htmlFor="edit-product-slug">
              Slug
            </label>
            <input
              id="edit-product-slug"
              type="text"
              name="slug"
              defaultValue={selectedProductForEdit.slug}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              required
            />
            <label className="block text-xs font-medium text-muted-foreground" htmlFor="edit-product-category">
              Category
            </label>
            <select
              id="edit-product-category"
              name="categoryId"
              defaultValue={selectedProductForEdit.categoryId}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              required
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <label className="block text-xs font-medium text-muted-foreground" htmlFor="edit-product-base-sku">
              Base SKU
            </label>
            <input
              id="edit-product-base-sku"
              type="text"
              name="baseSku"
              defaultValue={selectedProductForEdit.baseSku}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              required
            />
            <label className="block text-xs font-medium text-muted-foreground" htmlFor="edit-product-description">
              Description
            </label>
            <textarea
              id="edit-product-description"
              name="description"
              defaultValue={selectedProductForEdit.description}
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            <label className="block text-xs font-medium text-muted-foreground" htmlFor="edit-product-tags">
              Tags (comma separated)
            </label>
            <input
              id="edit-product-tags"
              type="text"
              name="tags"
              defaultValue={selectedProductForEdit.tags.join(",")}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-muted-foreground" htmlFor="edit-product-price">
                  Price (cents)
                </label>
                <input
                  id="edit-product-price"
                  type="number"
                  min={0}
                  name="priceCents"
                  defaultValue={selectedProductForEdit.priceCents}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground" htmlFor="edit-product-compare">
                  Compare-at (cents)
                </label>
                <input
                  id="edit-product-compare"
                  type="number"
                  min={0}
                  name="compareAtPriceCents"
                  defaultValue={selectedProductForEdit.compareAtPriceCents}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-muted-foreground" htmlFor="edit-product-currency">
                  Currency
                </label>
                <select
                  id="edit-product-currency"
                  name="currency"
                  defaultValue={selectedProductForEdit.currency}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground" htmlFor="edit-product-status">
                  Status
                </label>
                <select
                  id="edit-product-status"
                  name="status"
                  defaultValue={selectedProductForEdit.status}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="draft">draft</option>
                  <option value="active">active</option>
                  <option value="archived">archived</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
                Save product changes
              </button>
              <Link href="/admin/products" className="rounded-md border px-3 py-2 text-sm hover:bg-background">
                Cancel
              </Link>
            </div>
          </form>
        ) : (
          <div className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">
            Select <span className="font-medium text-foreground">Edit</span> on a product row to load the edit form.
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-6 text-card-foreground">
        <h2 className="text-lg font-semibold">Products table</h2>
        <ProductsTable rows={products} />
      </section>

      <section className="grid gap-4 rounded-lg border bg-card p-6 text-card-foreground lg:grid-cols-2">
        <form action={createVariantAction} className="space-y-3 rounded-md border bg-muted p-3">
          <h2 className="text-lg font-semibold">Create variant</h2>
          <label className="block text-xs font-medium text-muted-foreground" htmlFor="create-variant-product">
            Product
          </label>
          <select id="create-variant-product" name="productId" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
          <label className="block text-xs font-medium text-muted-foreground" htmlFor="create-variant-name">
            Variant name
          </label>
          <input
            id="create-variant-name"
            type="text"
            name="name"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          />
          <label className="block text-xs font-medium text-muted-foreground" htmlFor="create-variant-sku">
            SKU
          </label>
          <input
            id="create-variant-sku"
            type="text"
            name="sku"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          />
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground" htmlFor="create-variant-price">
                Price (cents)
              </label>
              <input
                id="create-variant-price"
                type="number"
                min={0}
                name="priceCents"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground" htmlFor="create-variant-compare">
                Compare-at (cents)
              </label>
              <input
                id="create-variant-compare"
                type="number"
                min={0}
                name="compareAtPriceCents"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground" htmlFor="create-variant-stock">
                Stock
              </label>
              <input
                id="create-variant-stock"
                type="number"
                min={0}
                name="stockOnHand"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                required
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isDefault" />
            Set as default variant
          </label>
          <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
            Create variant
          </button>
        </form>

        {selectedVariantForEdit ? (
          <form action={updateVariantAction} className="space-y-3 rounded-md border bg-muted p-3">
            <h2 className="text-lg font-semibold">Edit variant</h2>
            <input type="hidden" name="id" value={selectedVariantForEdit.id} />
            <label className="block text-xs font-medium text-muted-foreground" htmlFor="edit-variant-name">
              Variant name
            </label>
            <input
              id="edit-variant-name"
              type="text"
              name="name"
              defaultValue={selectedVariantForEdit.name}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              required
            />
            <label className="block text-xs font-medium text-muted-foreground" htmlFor="edit-variant-sku">
              SKU
            </label>
            <input
              id="edit-variant-sku"
              type="text"
              name="sku"
              defaultValue={selectedVariantForEdit.sku}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              required
            />
            <div className="grid gap-2 sm:grid-cols-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground" htmlFor="edit-variant-price">
                  Price (cents)
                </label>
                <input
                  id="edit-variant-price"
                  type="number"
                  min={0}
                  name="priceCents"
                  defaultValue={selectedVariantForEdit.priceCents}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground" htmlFor="edit-variant-compare">
                  Compare-at (cents)
                </label>
                <input
                  id="edit-variant-compare"
                  type="number"
                  min={0}
                  name="compareAtPriceCents"
                  defaultValue={selectedVariantForEdit.compareAtPriceCents}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground" htmlFor="edit-variant-stock-mode">
                  Stock mode
                </label>
                <select
                  id="edit-variant-stock-mode"
                  name="stockMode"
                  defaultValue="set"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="set">Set exact stock</option>
                  <option value="adjust">Adjust by delta (+/-)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground" htmlFor="edit-variant-stock-value">
                  Stock value
                </label>
                <input
                  id="edit-variant-stock-value"
                  type="number"
                  name="stockValue"
                  defaultValue={selectedVariantForEdit.stockOnHand}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  required
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Current stock: <span className="font-medium text-foreground">{selectedVariantForEdit.stockOnHand}</span>. Use
              <span className="font-medium"> set </span>to replace or
              <span className="font-medium"> adjust </span>to add/remove units.
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isDefault" defaultChecked={selectedVariantForEdit.isDefault} />
              Set as default variant
            </label>
            <div className="flex gap-2">
              <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
                Save variant changes
              </button>
              <Link href="/admin/products" className="rounded-md border px-3 py-2 text-sm hover:bg-background">
                Cancel
              </Link>
            </div>
          </form>
        ) : (
          <div className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">
            Select <span className="font-medium text-foreground">Edit</span> on a variant row to load the edit form.
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-6 text-card-foreground">
        <h2 className="text-lg font-semibold">Variants table</h2>
        <VariantsTable rows={variants} />
      </section>
    </main>
  );
}
