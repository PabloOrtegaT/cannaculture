import { expect, test } from "@playwright/test";
import { loginAsSeedOwner } from "./helpers/auth";

test("admin product create and edit flow", async ({ page }) => {
  await loginAsSeedOwner(page, { nextPath: "/admin" });
  await page.goto("/admin/products");
  await expect(page.getByRole("heading", { name: "Products", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "New product" }).click();
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

  const variantRowLocator = () =>
    page.locator("tr", { hasText: updatedName }).filter({ hasText: "Default" }).first();

  await variantRowLocator().getByRole("link", { name: "Edit" }).click();
  const editVariantForm = page.getByRole("heading", { name: "Edit variant" });
  await expect(editVariantForm).toBeVisible();
  await expect(page.getByText("Current stock: 8")).toBeVisible();

  await expect(page.getByLabel("Species*")).toBeVisible();
  await page.getByLabel("Species*").fill("Ocimum basilicum");
  await page.getByRole("combobox", { name: "Sunlight*" }).click();
  await page.getByRole("option", { name: "full-sun" }).click();
  await page.getByLabel("Germination (days)*").fill("8");
  await page.getByRole("combobox", { name: "Seasonality" }).click();
  await page.getByRole("option", { name: "spring" }).click();
  await page.getByLabel("Heirloom").check();

  await page.getByRole("combobox", { name: "Stock mode" }).click();
  await page.getByRole("option", { name: "Adjust by delta (+/-)" }).click();
  await page.getByLabel("Stock value").fill("2");
  await page.getByRole("button", { name: "Save variant changes" }).click();
  await expect(page.getByTestId("flash-toast")).toContainText("Variant updated");
  await expect(page.getByText("Current stock: 10")).toBeVisible();

  await expect(page.getByLabel("Species*")).toHaveValue("Ocimum basilicum");
  await expect(page.getByLabel("Germination (days)*")).toHaveValue("8");
  await expect(page.getByLabel("Heirloom")).toBeChecked();

  await page.getByRole("combobox", { name: "Stock mode" }).click();
  await page.getByRole("option", { name: "Set exact stock" }).click();
  await page.getByLabel("Stock value").fill("4");
  await page.getByRole("button", { name: "Save variant changes" }).click();
  await expect(page.getByTestId("flash-toast")).toContainText("Variant updated");
  await expect(page.getByText("Current stock: 4")).toBeVisible();

  await page.getByRole("link", { name: "Back to product" }).click();
  await expect(page.getByText("Edit product details and manage variants.")).toBeVisible();

  const variantSuffix = Date.now().toString(36);
  const newVariantName = `New Variant ${variantSuffix}`;
  const newVariantSku = `E2E_VAR_${variantSuffix.toUpperCase()}`;
  await page.getByLabel("Variant name").last().fill(newVariantName);
  await page.getByLabel("SKU").last().fill(newVariantSku);
  await page.getByLabel("Price (cents)").last().fill("39900");
  await page.getByLabel("Initial stock").last().fill("12");
  await page.getByLabel("Species*").last().fill("Lavandula angustifolia");
  await page.getByRole("combobox", { name: "Sunlight*" }).last().click();
  await page.getByRole("option", { name: "full-sun" }).click();
  await page.getByLabel("Germination (days)*").last().fill("14");
  await page.getByRole("button", { name: "Create variant" }).click();
  await expect(page.getByTestId("flash-toast")).toContainText("Variant created");

  const newVariantRow = page.locator("tr", { hasText: newVariantName }).first();
  await expect(newVariantRow).toBeVisible();
  await newVariantRow.getByRole("link", { name: "Edit" }).click();
  await expect(page.getByRole("heading", { name: "Edit variant" })).toBeVisible();
  await expect(page.getByLabel("Species*")).toHaveValue("Lavandula angustifolia");
  await expect(page.getByLabel("Germination (days)*")).toHaveValue("14");
});
