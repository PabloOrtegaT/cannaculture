import Link from "next/link";
import { AccessDenied } from "@/components/admin/access-denied";
import { ProductsTable, VariantsTable } from "@/components/admin/tables";
import {
  createCategoryAction,
  createProductAction,
  createVariantAction,
  updateProductAction,
  updateVariantAction,
} from "@/app/(admin)/admin/actions";
import {
  listAdminCategories,
  listAdminCategoryAttributes,
  listAdminProducts,
  listAdminVariants,
} from "@/server/admin/admin-service";
import { getRouteAccess } from "@/server/admin/role-guard";

type AdminProductsPageProps = {
  searchParams?: Promise<{
    editProduct?: string;
    editVariant?: string;
  }>;
};

export default async function AdminProductsPage({ searchParams }: AdminProductsPageProps) {
  const access = getRouteAccess("products");
  if (!access.allowed) {
    return <AccessDenied role={access.role} section="products" />;
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const categories = listAdminCategories();
  const categoryAttributes = listAdminCategoryAttributes();
  const products = listAdminProducts();
  const variants = listAdminVariants();

  const selectedProductForEdit = products.find((product) => product.id === resolvedSearchParams?.editProduct);
  const selectedVariantForEdit = variants.find((variant) => variant.id === resolvedSearchParams?.editVariant);

  return (
    <main className="space-y-6">
      <section className="grid gap-4 rounded-lg border bg-card p-6 text-card-foreground lg:grid-cols-2">
        <div className="space-y-3">
          <h1 className="text-xl font-semibold">Category management</h1>
          <p className="text-sm text-muted-foreground">
            Create profile-scoped categories and inspect template attribute definitions.
          </p>
          <form action={createCategoryAction} className="space-y-2 rounded-md border bg-muted p-3">
            <p className="text-sm font-medium">Create category</p>
            <input
              type="text"
              name="name"
              placeholder="Category name"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              required
            />
            <input
              type="text"
              name="slug"
              placeholder="category-slug (optional)"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
              Add category
            </button>
          </form>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Attribute templates</h2>
          <div className="max-h-72 space-y-3 overflow-auto rounded-md border bg-muted p-3">
            {categoryAttributes.map((entry) => (
              <article key={entry.categoryId} className="rounded-md border bg-background p-3">
                <p className="font-medium">{entry.categoryName}</p>
                <p className="text-xs text-muted-foreground">Template: {entry.templateKey}</p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {entry.attributes.map((attribute) => (
                    <li key={attribute.key}>
                      {attribute.key} ({attribute.type}) {attribute.required ? "required" : "optional"}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-lg border bg-card p-6 text-card-foreground lg:grid-cols-2">
        <form action={createProductAction} className="space-y-2 rounded-md border bg-muted p-3" data-testid="create-product-form">
          <h2 className="text-lg font-semibold">Create product</h2>
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
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
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
            <div>
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
            </div>
          </div>
          <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
            Create product
          </button>
        </form>

        {selectedProductForEdit ? (
          <form
            action={updateProductAction}
            className="space-y-2 rounded-md border bg-muted p-3"
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
        <form action={createVariantAction} className="space-y-2 rounded-md border bg-muted p-3">
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
          <div className="grid gap-2 sm:grid-cols-2">
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
          <form action={updateVariantAction} className="space-y-2 rounded-md border bg-muted p-3">
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
            <div className="grid gap-2 sm:grid-cols-2">
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
                <label className="block text-xs font-medium text-muted-foreground" htmlFor="edit-variant-stock">
                  Stock
                </label>
                <input
                  id="edit-variant-stock"
                  type="number"
                  min={0}
                  name="stockOnHand"
                  defaultValue={selectedVariantForEdit.stockOnHand}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  required
                />
              </div>
            </div>
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
