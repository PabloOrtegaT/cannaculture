import { describe, expect, it } from "vitest";
import { productInputSchema } from "@base-ecommerce/validation";

describe("productInputSchema", () => {
  it("accepts a valid payload", () => {
    const parsed = productInputSchema.parse({
      categoryId: "4f6fb94d-fb44-46eb-9885-dd8b16be6fdb",
      categoryTemplateKey: "pc-components",
      name: "Starter Motherboard",
      slug: "starter-motherboard",
      priceCents: 99900,
      compareAtPriceCents: 129900,
      currency: "MXN",
      baseSku: "START-001",
      status: "active",
      tags: ["starter"],
      attributeValues: {
        socket: "AM5",
      },
    });

    expect(parsed.name).toBe("Starter Motherboard");
    expect(parsed.status).toBe("active");
    expect(parsed.tags).toEqual(["starter"]);
  });

  it("rejects compareAtPriceCents when it is not greater than priceCents", () => {
    const result = productInputSchema.safeParse({
      categoryId: "4f6fb94d-fb44-46eb-9885-dd8b16be6fdb",
      categoryTemplateKey: "pc-components",
      name: "Invalid Product",
      slug: "invalid-product",
      priceCents: 99900,
      compareAtPriceCents: 99900,
      currency: "MXN",
      baseSku: "INVALID-001",
      status: "draft",
      tags: [],
      attributeValues: {},
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected schema validation to fail.");
    }
    expect(result.error.issues[0]?.path).toContain("compareAtPriceCents");
  });
});
