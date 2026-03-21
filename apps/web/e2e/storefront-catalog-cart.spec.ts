import { expect, test, type Page } from "@playwright/test";

async function addFirstInStockProduct(page: Page) {
  await page.goto("/catalog");
  const productLinks = page.getByRole("link", { name: "View product" });
  const linkCount = await productLinks.count();

  for (let index = 0; index < linkCount; index += 1) {
    await productLinks.nth(index).click();
    const addToCartButton = page.getByTestId("add-to-cart");
    await expect(addToCartButton).toBeVisible();

    const stockStatusText = ((await page.getByTestId("stock-status").textContent()) ?? "").toLowerCase();
    if (stockStatusText.includes("out of stock")) {
      await page.goto("/catalog");
      continue;
    }

    try {
      await expect(addToCartButton).toBeEnabled({ timeout: 10000 });
      await addToCartButton.click();
      return;
    } catch {
      await page.goto("/catalog");
    }
  }

  throw new Error("No purchasable product found in catalog.");
}

test("browse -> product -> add to cart", async ({ page }) => {
  await page.goto("/catalog");
  await expect(page.getByRole("heading", { name: "Catalog" })).toBeVisible();

  await page.getByRole("link", { name: "View product" }).first().click();
  const productName = ((await page.getByRole("heading", { level: 1 }).textContent()) ?? "").trim();
  expect(productName.length).toBeGreaterThan(0);

  await addFirstInStockProduct(page);
  await page.getByRole("link", { name: "Go to cart" }).click();

  await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();
  await expect(page.getByText(productName)).toBeVisible();
});

test("stock status controls add-to-cart availability", async ({ page }) => {
  await page.goto("/catalog");
  await page.getByRole("link", { name: "View product" }).first().click();
  const stockStatus = page.getByTestId("stock-status");
  await expect(stockStatus).toBeVisible();

  const statusText = (await stockStatus.textContent()) ?? "";
  const addToCartButton = page.getByTestId("add-to-cart");

  if (statusText.toLowerCase().includes("out of stock")) {
    await expect(addToCartButton).toBeDisabled();
    return;
  }

  await expect(addToCartButton).toBeEnabled();
});

test("cart quantity can be increased and decreased", async ({ page }) => {
  await addFirstInStockProduct(page);
  await page.getByRole("link", { name: "Go to cart" }).click();

  const quantityLabel = page.locator("[data-testid^='cart-qty-']").first();
  const initialQuantity = Number((await quantityLabel.textContent()) ?? "0");
  const increaseButton = page.getByRole("button", { name: /Increase .* quantity/ }).first();

  await expect(increaseButton).toBeEnabled();
  await increaseButton.click();

  await expect
    .poll(async () => Number((await quantityLabel.textContent()) ?? "0"), {
      timeout: 10000,
    })
    .toBe(initialQuantity + 1);

  const decreaseButton = page.getByRole("button", { name: /Decrease .* quantity/ }).first();
  await expect(decreaseButton).toBeEnabled();
  await decreaseButton.click();

  await expect
    .poll(async () => Number((await quantityLabel.textContent()) ?? "0"), {
      timeout: 10000,
    })
    .toBe(initialQuantity);
});
