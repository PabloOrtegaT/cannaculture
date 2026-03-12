import { describe, expect, it } from "vitest";
import { parseProductCsv } from "@/server/admin/csv-import";

describe("admin CSV import parser", () => {
  it("parses valid rows", () => {
    const csv = `name,slug,baseSku,categorySlug,status,currency,priceCents,stockOnHand
Test Product,test-product,TEST_PRODUCT,plant-seeds,active,MXN,19900,12`;

    const result = parseProductCsv(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.slug).toBe("test-product");
    expect(result.rows[0]?.priceCents).toBe(19900);
  });

  it("reports partial invalid rows while keeping valid rows", () => {
    const csv = `name,slug,baseSku,categorySlug,status,currency,priceCents,stockOnHand
Valid Product,valid-product,VALID_PRODUCT,plant-seeds,active,MXN,19900,5
Bad Product,bad-product,BAD_PRODUCT,plant-seeds,active,MXN,-10,2`;

    const result = parseProductCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.rowNumber).toBe(3);
  });

  it("rejects invalid headers", () => {
    const csv = `name,slug,price
One Product,one-product,2000`;

    const result = parseProductCsv(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.rowNumber).toBe(1);
    expect(result.errors[0]?.reason).toMatch(/Invalid headers/);
  });
});
