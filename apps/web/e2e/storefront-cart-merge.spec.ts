import { expect, test } from "@playwright/test";
import { loginAsSeedOwner } from "./helpers/auth";

test("guest cart merges into authenticated cart after login", async ({ page }) => {
  await page.goto("/catalog");
  const productLinks = page.locator("a[href^='/catalog/']");
  const linkCount = await productLinks.count();
  let added = false;
  let selectedProductName = "";

  for (let index = 0; index < linkCount; index += 1) {
    await productLinks.nth(index).click();
    const addToCartButton = page.getByTestId("add-to-cart");
    await expect(addToCartButton).toBeVisible();

    const stockStatusText = (
      (await page.getByTestId("stock-status").textContent()) ?? ""
    ).toLowerCase();
    if (stockStatusText.includes("out of stock")) {
      await page.goto("/catalog");
      continue;
    }

    try {
      await expect(addToCartButton).toBeEnabled({ timeout: 10000 });
      await addToCartButton.click();
      selectedProductName = (
        (await page.getByRole("heading", { level: 1 }).textContent()) ?? ""
      ).trim();
      added = true;
      break;
    } catch {
      await page.goto("/catalog");
    }
  }

  expect(added).toBe(true);

  await loginAsSeedOwner(page);

  await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();
  if (selectedProductName.length > 0) {
    await expect(page.getByText(selectedProductName)).toBeVisible();
  }
});
