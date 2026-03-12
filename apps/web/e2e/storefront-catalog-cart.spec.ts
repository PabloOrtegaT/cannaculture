import { expect, test } from "@playwright/test";

test("browse -> product -> add to cart", async ({ page }) => {
  await page.goto("/catalog");
  await expect(page.getByRole("heading", { name: "Catalog" })).toBeVisible();

  await page.getByRole("link", { name: "View product" }).first().click();
  await expect(page.getByTestId("add-to-cart")).toBeVisible();

  await page.getByTestId("add-to-cart").click();
  await page.getByRole("link", { name: "Go to cart" }).click();

  await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Dragon Planter|AM5 Motherboard X|Basil Seeds Pack/ })).toBeVisible();
});

test("out-of-stock product cannot be added to cart", async ({ page }) => {
  await page.goto("/catalog/plant-seeds/basil-seeds-pack");
  await expect(page.getByRole("heading", { name: "Basil Seeds Pack" })).toBeVisible();
  await expect(page.getByTestId("stock-status")).toContainText("Out of stock");
  await expect(page.getByTestId("add-to-cart")).toBeDisabled();
});
