import { categoryTemplateKeySchema } from "@base-ecommerce/domain";
import Link from "next/link";
import { AccessDenied } from "@/components/admin/access-denied";
import { CategoriesTable } from "@/components/admin/tables";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createCategoryAction, updateCategoryAction } from "@/app/(admin)/admin/actions";
import { listAdminCategories, listAdminCategoryAttributes } from "@/server/admin/admin-service";
import { getRouteAccess } from "@/server/admin/role-guard";

type AdminCategoriesPageProps = {
  searchParams?: Promise<{
    editCategory?: string;
  }>;
};

export default async function AdminCategoriesPage({ searchParams }: AdminCategoriesPageProps) {
  const access = await getRouteAccess("categories");
  if (!access.allowed) {
    return <AccessDenied role={access.role ?? "unknown"} section="categories" />;
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const categories = listAdminCategories();
  const categoryAttributes = listAdminCategoryAttributes();
  const selectedCategoryForEdit = categories.find(
    (category) => category.id === resolvedSearchParams?.editCategory,
  );

  return (
    <main className="space-y-6">
      <section className="grid gap-4 rounded-lg border bg-card p-6 text-card-foreground lg:grid-cols-2">
        <form
          action={createCategoryAction}
          className="space-y-3 rounded-md border bg-muted p-3"
          data-testid="create-category-form"
        >
          <h1 className="text-xl font-semibold">Create category</h1>
          <Label className="text-xs text-muted-foreground" htmlFor="create-category-name">
            Name
          </Label>
          <Input
            id="create-category-name"
            type="text"
            name="name"
            placeholder="Category name"
            className="bg-background"
            required
          />
          <Label className="text-xs text-muted-foreground" htmlFor="create-category-slug">
            Slug
          </Label>
          <Input
            id="create-category-slug"
            type="text"
            name="slug"
            placeholder="category-slug"
            className="bg-background"
            required
          />
          <Label className="text-xs text-muted-foreground" htmlFor="create-category-description">
            Description
          </Label>
          <Textarea
            id="create-category-description"
            name="description"
            placeholder="Optional category description"
            rows={3}
            className="bg-background"
          />
          <Label className="text-xs text-muted-foreground" htmlFor="create-category-template">
            Template
          </Label>
          <Select name="templateKey" required>
            <SelectTrigger id="create-category-template" className="bg-background">
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {categoryTemplateKeySchema.options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit">Add category</Button>
        </form>

        {selectedCategoryForEdit ? (
          <form
            action={updateCategoryAction}
            className="space-y-3 rounded-md border bg-muted p-3"
            data-testid="edit-category-form"
          >
            <h2 className="text-lg font-semibold">Edit category</h2>
            <input type="hidden" name="id" value={selectedCategoryForEdit.id} />
            <Label className="text-xs text-muted-foreground" htmlFor="edit-category-name">
              Name
            </Label>
            <Input
              id="edit-category-name"
              type="text"
              name="name"
              defaultValue={selectedCategoryForEdit.name}
              className="bg-background"
              required
            />
            <Label className="text-xs text-muted-foreground" htmlFor="edit-category-slug">
              Slug
            </Label>
            <Input
              id="edit-category-slug"
              type="text"
              name="slug"
              defaultValue={selectedCategoryForEdit.slug}
              className="bg-background"
              required
            />
            <Label className="text-xs text-muted-foreground" htmlFor="edit-category-description">
              Description
            </Label>
            <Textarea
              id="edit-category-description"
              name="description"
              defaultValue={selectedCategoryForEdit.description}
              rows={3}
              className="bg-background"
            />
            <Label className="text-xs text-muted-foreground" htmlFor="edit-category-template">
              Template
            </Label>
            <Select name="templateKey" required defaultValue={selectedCategoryForEdit.templateKey}>
              <SelectTrigger id="edit-category-template" className="bg-background">
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {categoryTemplateKeySchema.options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button type="submit">Save category changes</Button>
              <Button variant="outline" asChild>
                <Link href="/admin/categories">Cancel</Link>
              </Button>
            </div>
          </form>
        ) : (
          <div className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">
            Select <span className="font-medium text-foreground">Edit</span> on a category row to
            load the edit form.
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-6 text-card-foreground">
        <h2 className="text-lg font-semibold">Categories table</h2>
        <CategoriesTable rows={categories} />
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-6 text-card-foreground">
        <h2 className="text-lg font-semibold">Attribute templates</h2>
        <div className="max-h-72 space-y-3 overflow-auto rounded-md border bg-muted p-3">
          {categoryAttributes.map((entry) => (
            <article key={entry.categoryId} className="rounded-md border bg-background p-3">
              <p className="font-medium">{entry.categoryName}</p>
              <p className="text-xs text-muted-foreground">Template: {entry.templateKey}</p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {entry.attributes.map((attribute) => (
                  <li key={attribute.key}>
                    {attribute.key} ({attribute.type}){" "}
                    {attribute.required ? "required" : "optional"}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
