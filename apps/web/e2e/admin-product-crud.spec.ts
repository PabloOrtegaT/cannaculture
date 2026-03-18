import { expect, test } from "@playwright/test";
import { loginAsSeedOwner } from "./helpers/auth";

test("admin product create and edit flow", async ({ page }) => {
  await loginAsSeedOwner(page, { nextPath: "/admin" });
  await page.goto("/admin/products");
  await expect(page.getByRole("heading", { name: "Create product" })).toBeVisible();

  const suffix = Date.now().toString(36);
  const productName = `E2E Admin Product ${suffix}`;
  const productSlug = `e2e-admin-product-${suffix}`;
  const baseSku = `E2E_ADMIN_${suffix.toUpperCase()}`;
  const createForm = page.getByTestId("create-product-form");
  await createForm.getByLabel("Name").fill(productName);
  await createForm.getByLabel("Slug").fill(productSlug);
  await createForm.getByLabel("Base SKU").fill(baseSku);
  await createForm.getByLabel("Price (cents)").fill("45900");
  await createForm.getByLabel("Initial stock").fill("8");
  await createForm.getByRole("button", { name: "Create product" }).click();

  const productRow = page.locator("tr", { hasText: productName }).first();
  await expect(productRow).toBeVisible();
  await productRow.getByRole("link", { name: "Edit" }).click();

  const updatedName = `${productName} Updated`;
  const editForm = page.getByTestId("edit-product-form");
  await expect(editForm).toBeVisible();
  await editForm.getByLabel("Name").fill(updatedName);
  await editForm.getByRole("button", { name: "Save product changes" }).click();

  await expect(page.locator("tr", { hasText: updatedName }).first()).toBeVisible();
  await expect(page.getByTestId("flash-toast")).toContainText("Product updated");

  const variantRowLocator = () => page.locator("tr", { hasText: updatedName }).filter({ hasText: "Default" }).first();

  await variantRowLocator().getByRole("link", { name: "Edit" }).click();
  const editVariantForm = page.getByRole("heading", { name: "Edit variant" });
  await expect(editVariantForm).toBeVisible();
  await expect(page.getByText("Current stock: 8")).toBeVisible();
  await page.getByLabel("Stock mode").selectOption("adjust");
  await page.getByLabel("Stock value").fill("2");
  await page.getByRole("button", { name: "Save variant changes" }).click();
  await expect(page.getByTestId("flash-toast")).toContainText("Variant updated");

  await variantRowLocator().getByRole("link", { name: "Edit" }).click();
  await expect(page.getByText("Current stock: 10")).toBeVisible();
  await page.getByLabel("Stock mode").selectOption("set");
  await page.getByLabel("Stock value").fill("4");
  await page.getByRole("button", { name: "Save variant changes" }).click();
  await expect(page.getByTestId("flash-toast")).toContainText("Variant updated");

  await variantRowLocator().getByRole("link", { name: "Edit" }).click();
  await expect(page.getByText("Current stock: 4")).toBeVisible();
});
