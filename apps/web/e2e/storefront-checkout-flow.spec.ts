import { expect, test, type Page } from "@playwright/test";
import { loginAsSeedOwner } from "./helpers/auth";

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

test("authenticated checkout -> mock payment success -> order confirmation", async ({ page }) => {
  // Add a product to guest cart
  await addFirstInStockProduct(page);

  // Login (this triggers cart sync)
  await loginAsSeedOwner(page);
  await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();

  // Verify cart has items
  const subtotalText = await page.getByText("Subtotal:").textContent();
  expect(subtotalText).toBeTruthy();

  // Start checkout
  const checkoutButton = page.getByRole("button", { name: "Continue to payment" });
  await expect(checkoutButton).toBeEnabled({ timeout: 10000 });
  await checkoutButton.click();

  // Should be redirected to mock checkout page
  await page.waitForURL((url) => url.pathname.startsWith("/checkout/mock"), {
    timeout: 15000,
  });

  // Simulate successful payment
  const successButton = page.getByRole("button", { name: "Simulate payment success" });
  await expect(successButton).toBeVisible();
  await successButton.click();

  // Should be redirected to success page
  await page.waitForURL((url) => url.pathname.startsWith("/checkout/success"), {
    timeout: 15000,
  });
  await expect(page.getByRole("heading", { name: "Payment completed" })).toBeVisible();
  await expect(page.getByText("Order reference:")).toBeVisible();
});

test("authenticated checkout -> mock payment failure -> cancel page", async ({ page }) => {
  await addFirstInStockProduct(page);
  await loginAsSeedOwner(page);
  await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();

  const checkoutButton = page.getByRole("button", { name: "Continue to payment" });
  await expect(checkoutButton).toBeEnabled({ timeout: 10000 });
  await checkoutButton.click();

  await page.waitForURL((url) => url.pathname.startsWith("/checkout/mock"), {
    timeout: 15000,
  });

  const failButton = page.getByRole("button", { name: "Simulate payment failure" });
  await expect(failButton).toBeVisible();
  await failButton.click();

  await page.waitForURL((url) => url.pathname.startsWith("/checkout/cancel"), {
    timeout: 15000,
  });
});

test("unauthenticated user sees sign-in prompt on checkout", async ({ page }) => {
  await addFirstInStockProduct(page);
  await page.getByRole("link", { name: "Go to cart" }).click();

  await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();
  await expect(page.getByText("Sign in to continue checkout")).toBeVisible();

  const checkoutButton = page.getByRole("button", { name: "Continue to payment" });
  await expect(checkoutButton).toBeDisabled();
});

test("order appears on account page after successful checkout", async ({ page }) => {
  await addFirstInStockProduct(page);
  await loginAsSeedOwner(page);
  await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();

  const checkoutButton = page.getByRole("button", { name: "Continue to payment" });
  await expect(checkoutButton).toBeEnabled({ timeout: 10000 });
  await checkoutButton.click();

  await page.waitForURL((url) => url.pathname.startsWith("/checkout/mock"), {
    timeout: 15000,
  });
  await page.getByRole("button", { name: "Simulate payment success" }).click();

  await page.waitForURL((url) => url.pathname.startsWith("/checkout/success"), {
    timeout: 15000,
  });

  // Navigate to account page and verify order exists
  await page.getByRole("link", { name: "View account orders" }).click();
  await page.waitForURL((url) => url.pathname === "/account", { timeout: 10000 });
  await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();

  // Should show at least one order
  await expect(page.getByText("paid").first()).toBeVisible({ timeout: 10000 });
});
