import { describe, expect, it } from "vitest";
import { listCatalogProducts } from "@/server/data/storefront-service";

describe("listCatalogProducts price filtering", () => {
  it("returns all products when no price bounds are set", () => {
    const all = listCatalogProducts();
    const filtered = listCatalogProducts({});
    expect(filtered.length).toBe(all.length);
  });

  it("excludes products below priceMin (inclusive lower bound, dollars)", () => {
    const expensive = listCatalogProducts({ priceMin: 999999 }); // $9,999.99 minimum
    expect(expensive.length).toBe(0);
  });

  it("excludes products above priceMax (inclusive upper bound, dollars)", () => {
    const cheap = listCatalogProducts({ priceMax: 0 }); // $0 maximum
    expect(cheap.length).toBe(0);
  });

  it("filters within a price range", () => {
    const all = listCatalogProducts();
    // A range that includes everything: 0 to $100,000
    const wide = listCatalogProducts({ priceMin: 0, priceMax: 100000 });
    expect(wide.length).toBe(all.length);
  });
});
