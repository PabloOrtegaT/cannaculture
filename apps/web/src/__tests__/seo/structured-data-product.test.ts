import { describe, expect, it } from "vitest";
import { buildProductJsonLd } from "@/server/seo/structured-data";

describe("product structured data", () => {
  it("includes brand, offer, and availability for in-stock items", () => {
    const data = buildProductJsonLd({
      name: "Basil Seeds Pack",
      description: "Organic basil seeds with planting guide.",
      pathname: "/catalog/plant-seeds/basil-seeds-pack",
      currency: "USD",
      priceCents: 499,
      stockOnHand: 10,
      sku: "SEED-BASIL-001-PACK",
    });

    expect(data["@type"]).toBe("Product");
    expect(data.name).toBe("Basil Seeds Pack");
    expect(data.brand).toEqual({ "@type": "Brand", name: "Cannaculture" });
    expect(data.sku).toBe("SEED-BASIL-001-PACK");
    expect(data.offers).toMatchObject({
      "@type": "Offer",
      priceCurrency: "USD",
      price: "4.99",
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      sku: "SEED-BASIL-001-PACK",
    });
  });

  it("shows out of stock when stockOnHand is zero", () => {
    const data = buildProductJsonLd({
      name: "Out of Stock Item",
      description: "Test product.",
      pathname: "/catalog/test",
      currency: "USD",
      priceCents: 1000,
      stockOnHand: 0,
    });

    expect(data.offers).toMatchObject({
      availability: "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    });
    expect(data.sku).toBeUndefined();
  });
});
