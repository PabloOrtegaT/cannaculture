import { expect, test } from "@playwright/test";

function getCategorySlugFromTemplate(template: string) {
  const lines = template.trim().split("\n");
  const firstDataRow = lines[1] ?? "";
  const columns = firstDataRow.split(",");
  return columns[3] ?? "catalog";
}

test("admin CSV import supports success and partial-failure paths", async ({ page }) => {
  await page.goto("/admin/import");
  await expect(page.getByRole("heading", { name: "Bulk CSV import" })).toBeVisible();

  const csvInput = page.getByLabel("CSV payload");
  const template = await csvInput.inputValue();
  const categorySlug = getCategorySlugFromTemplate(template);

  const successCsv = `name,slug,baseSku,categorySlug,status,currency,priceCents,stockOnHand
E2E Import Product,e2e-import-product,E2E_IMPORT_PRODUCT,${categorySlug},active,MXN,22900,4`;
  await csvInput.fill(successCsv);
  await page.getByRole("button", { name: "Run import" }).click();
  await expect(page.getByText(/Imported products:\s*1/)).toBeVisible();
  await expect(page.getByText(/Row errors:\s*0/)).toBeVisible();

  const partialCsv = `name,slug,baseSku,categorySlug,status,currency,priceCents,stockOnHand
E2E Import Product 2,e2e-import-product-2,E2E_IMPORT_PRODUCT_2,${categorySlug},active,MXN,13900,2
Invalid Product,invalid-product,INVALID_PRODUCT,${categorySlug},active,MXN,-200,1`;
  await csvInput.fill(partialCsv);
  await page.getByRole("button", { name: "Run import" }).click();
  await expect(page.getByText(/Imported products:\s*1/)).toBeVisible();
  await expect(page.getByText(/Row errors:\s*1/)).toBeVisible();
});
