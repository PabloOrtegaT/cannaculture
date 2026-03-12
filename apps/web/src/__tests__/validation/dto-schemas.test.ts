import { describe, expect, it } from "vitest";
import {
  createCategoryInputSchema,
  createNewsPostInputSchema,
  createVariantInputSchema,
} from "@base-ecommerce/validation";

describe("API DTO validation", () => {
  it("rejects malformed category payload", () => {
    const result = createCategoryInputSchema.safeParse({
      slug: "Invalid Slug",
      name: "PC Components",
      templateKey: "pc-components",
    });

    expect(result.success).toBe(false);
  });

  it("rejects malformed variant payload with invalid compare-at price", () => {
    const result = createVariantInputSchema.safeParse({
      productId: "4f6fb94d-fb44-46eb-9885-dd8b16be6fdb",
      sku: "VAR-001",
      name: "Variant",
      priceCents: 2000,
      compareAtPriceCents: 1500,
      stockOnHand: 10,
      attributeValues: {},
    });

    expect(result.success).toBe(false);
  });

  it("rejects malformed news payload", () => {
    const result = createNewsPostInputSchema.safeParse({
      slug: "short",
      title: "Hi",
      summary: "Too short",
      body: "short body",
      status: "published",
    });

    expect(result.success).toBe(false);
  });
});
