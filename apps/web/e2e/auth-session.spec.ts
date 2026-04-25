import { expect, test } from "@playwright/test";
import { loginAsSeedOwner } from "./helpers/auth";

test("logout flow clears session and redirects", async ({ page }) => {
  await loginAsSeedOwner(page, { nextPath: "/account" });
  await page.waitForURL((url) => url.pathname === "/account", { timeout: 15000 });
  await expect(page.getByText("owner@cannaculture.local")).toBeVisible();

  // Click sign out from account page
  await page.getByRole("link", { name: "Sign out" }).click();

  // Should land on logout page first, then redirect
  await page.waitForURL((url) => url.pathname === "/" || url.pathname === "/login", {
    timeout: 15000,
  });

  // Session should be cleared: accessing account should redirect to login
  await page.goto("/account");
  await page.waitForURL((url) => url.pathname.startsWith("/login"), { timeout: 15000 });
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("logout-all API revokes all sessions", async ({ page, context }) => {
  await loginAsSeedOwner(page, { nextPath: "/account" });
  await page.waitForURL((url) => url.pathname === "/account", { timeout: 15000 });
  await expect(page.getByText("owner@cannaculture.local")).toBeVisible();

  // Call logout-all API directly
  const response = await page.request.post("/api/auth/logout-all");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.ok).toBe(true);

  // All cookies should be invalidated; try accessing a protected page in a new tab
  const newPage = await context.newPage();
  await newPage.goto("/account");
  await newPage.waitForURL((url) => url.pathname.startsWith("/login"), { timeout: 15000 });
  await expect(newPage.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("session revocation via logout API prevents reuse", async ({ page }) => {
  await loginAsSeedOwner(page, { nextPath: "/account" });
  await page.waitForURL((url) => url.pathname === "/account", { timeout: 15000 });

  // Call single logout API to revoke the current session
  const response = await page.request.post("/api/auth/logout");
  expect(response.status()).toBe(200);

  // Attempt to access a protected page with the same context
  await page.goto("/account");
  await page.waitForURL((url) => url.pathname.startsWith("/login"), { timeout: 15000 });
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("admin logout from sidebar clears session", async ({ page }) => {
  await loginAsSeedOwner(page, { nextPath: "/admin" });
  await page.waitForURL((url) => url.pathname === "/admin" || url.pathname.startsWith("/admin/"), {
    timeout: 15000,
  });
  await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible();

  // Click sign out in admin sidebar
  await page.getByRole("link", { name: "Sign out" }).click();

  // Should eventually redirect to login
  await page.waitForURL((url) => url.pathname === "/login" || url.pathname.startsWith("/login"), {
    timeout: 15000,
  });

  // Verify session is cleared by trying to access admin again
  await page.goto("/admin");
  await page.waitForURL((url) => url.pathname.startsWith("/login"), { timeout: 15000 });
});
