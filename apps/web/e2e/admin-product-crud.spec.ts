import { expect, test } from "@playwright/test";

test("admin product create and edit flow", async ({ page }) => {
  await page.goto("/admin/products");
  await expect(page.getByRole("heading", { name: "Create product" })).toBeVisible();

  const productName = "E2E Admin Product";
  const createForm = page.getByTestId("create-product-form");
  await createForm.getByLabel("Name").fill(productName);
  await createForm.getByLabel("Price (cents)").fill("45900");
  await createForm.getByLabel("Initial stock").fill("8");
  await createForm.getByRole("button", { name: "Create product" }).click();

  const productRow = page.locator("tr", { hasText: productName });
  await expect(productRow).toBeVisible();
  await productRow.getByRole("link", { name: "Edit" }).click();

  const updatedName = "E2E Admin Product Updated";
  const editForm = page.getByTestId("edit-product-form");
  await expect(editForm).toBeVisible();
  await editForm.getByLabel("Name").fill(updatedName);
  await editForm.getByRole("button", { name: "Save product changes" }).click();

  await expect(page.locator("tr", { hasText: updatedName })).toBeVisible();
});
