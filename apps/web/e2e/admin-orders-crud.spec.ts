import { expect, test } from "@playwright/test";
import { loginAsSeedOwner } from "./helpers/auth";

test("admin orders page renders with stats and table", async ({ page }) => {
  await loginAsSeedOwner(page, { nextPath: "/admin/orders" });
  await page.waitForURL((url) => url.pathname === "/admin/orders", { timeout: 15000 });

  // Page heading
  await expect(page.getByRole("heading", { name: "Orders", exact: true })).toBeVisible();
  await expect(page.getByText("Manage and fulfill customer orders")).toBeVisible();

  // Stats cards
  await expect(page.getByText("Total Orders")).toBeVisible();
  await expect(page.getByText("Paid")).toBeVisible();
  await expect(page.getByText("Pending")).toBeVisible();

  // Orders table section
  await expect(page.getByRole("heading", { name: "All orders" })).toBeVisible();

  // Table headers
  await expect(page.getByRole("columnheader", { name: "Order" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Total" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Items" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Top item" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Created" })).toBeVisible();
});

test("admin orders navigation from dashboard", async ({ page }) => {
  await loginAsSeedOwner(page, { nextPath: "/admin" });
  await page.waitForURL((url) => url.pathname === "/admin", { timeout: 15000 });

  // Click Orders in sidebar
  await page.getByRole("link", { name: "Orders" }).click();
  await page.waitForURL((url) => url.pathname === "/admin/orders", { timeout: 15000 });

  await expect(page.getByRole("heading", { name: "Orders", exact: true })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Order" })).toBeVisible();
});

test("admin orders table shows seeded orders or empty state", async ({ page }) => {
  await loginAsSeedOwner(page, { nextPath: "/admin/orders" });
  await page.waitForURL((url) => url.pathname === "/admin/orders", { timeout: 15000 });

  const table = page.locator("table").first();
  await expect(table).toBeVisible();

  // Either rows exist or the empty label is shown
  const rowCount = await table.locator("tbody tr").count();
  if (rowCount === 0) {
    await expect(page.getByText("No orders yet.")).toBeVisible();
  } else {
    // Verify at least one row has expected cells
    const firstRow = table.locator("tbody tr").first();
    await expect(firstRow.locator("td").first()).toBeVisible();
  }
});

/*
NOTE: Order detail view, status transitions, and cancellation are not yet
implemented in the admin UI. The orders page currently only lists orders
without clickable rows or action buttons. When those features are added,
the following tests should be expanded:

- Click an order row to navigate to /admin/orders/[id]
- Change order status via a select/button on the detail page
- Cancel an order via a cancel button
*/
