import { expect, test } from "@playwright/test";
import { loginAsSeedOwner } from "./helpers/auth";

test("admin category create and edit flow", async ({ page }) => {
  await loginAsSeedOwner(page, { nextPath: "/admin/categories" });
  await page.goto("/admin/categories");
  await expect(page.getByRole("heading", { name: "Create category" })).toBeVisible();

  const suffix = Date.now().toString(36);
  const categoryName = `E2E Category ${suffix}`;
  const categorySlug = `e2e-category-${suffix}`;
  const createForm = page.getByTestId("create-category-form");
  await createForm.getByLabel("Name").fill(categoryName);
  await createForm.getByLabel("Slug").fill(categorySlug);
  await createForm.getByRole("button", { name: "Add category" }).click();

  const row = page.locator("tr", { hasText: categoryName }).first();
  await expect(row).toBeVisible();
  await row.getByRole("link", { name: "Edit" }).click();

  const updatedName = `${categoryName} Updated`;
  const editForm = page.getByTestId("edit-category-form");
  await editForm.getByLabel("Name").fill(updatedName);
  await editForm.getByRole("button", { name: "Save category changes" }).click();

  await expect(page.locator("tr", { hasText: updatedName }).first()).toBeVisible();
  await expect(page.getByTestId("flash-toast")).toContainText("Category updated");

  await page.locator("tr", { hasText: updatedName }).first().getByRole("link", { name: "Edit" }).click();
  await editForm.getByLabel("Slug").fill("--");
  await editForm.getByRole("button", { name: "Save category changes" }).click();
  await expect(page.getByTestId("flash-toast")).toContainText("slug");
});
