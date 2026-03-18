import { expect, test } from "@playwright/test";
import { loginAsSeedOwner } from "./helpers/auth";

test("storefront admin entry opens admin host", async ({ page }) => {
  await loginAsSeedOwner(page);
  await page.goto("/");

  const adminLink = page.getByRole("link", { name: "Admin" });
  await expect(adminLink).toBeVisible();
  await adminLink.click();

  const configuredAdminBase =
    process.env.PLAYWRIGHT_ADMIN_BASE_URL ?? process.env.ADMIN_BASE_URL ?? "http://admin.lvh.me:3000";
  const expectedAdminHost = new URL(configuredAdminBase).hostname.toLowerCase();

  await page.waitForURL(
    (url) =>
      url.hostname.toLowerCase() === expectedAdminHost &&
      (url.pathname === "/admin" || url.pathname.startsWith("/admin/")),
    { timeout: 30000 },
  );
});
