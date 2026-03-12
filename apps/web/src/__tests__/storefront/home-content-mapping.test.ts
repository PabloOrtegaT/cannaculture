import { describe, expect, it } from "vitest";
import { defaultStoreProfile } from "@base-ecommerce/domain";
import { mapHomeContent } from "@/features/home/map-home-content";
import { getStorefrontSeed } from "@/server/data/storefront-db";

const seed = getStorefrontSeed(defaultStoreProfile);

describe("home content mapping", () => {
  it("maps active banner, published news, and featured products from data source", () => {
    const mapped = mapHomeContent({
      now: new Date("2026-03-10T10:00:00.000Z"),
      newsPosts: seed.newsPosts,
      promoBanners: seed.promoBanners,
      featuredSales: seed.featuredSales,
      products: seed.products,
    });

    expect(mapped.activeBanner).not.toBeNull();
    expect(mapped.news.length).toBeGreaterThan(0);
    expect(mapped.news[0]?.status).toBe("published");
    expect(mapped.featuredProducts.length).toBe(1);
  });

  it("returns empty featured products when sale is outside active window", () => {
    const mapped = mapHomeContent({
      now: new Date("2027-01-01T00:00:00.000Z"),
      newsPosts: seed.newsPosts,
      promoBanners: seed.promoBanners,
      featuredSales: seed.featuredSales,
      products: seed.products,
    });

    expect(mapped.activeBanner).toBeNull();
    expect(mapped.featuredProducts).toHaveLength(0);
  });
});
