import { afterEach, describe, expect, it } from "vitest";
import type { StoreProfile } from "@base-ecommerce/domain";
import { getHomeContent, listCatalogProducts, listCategories } from "@/server/data/storefront-service";

const previousStoreProfile = process.env.STORE_PROFILE;

function restoreStoreProfileEnv() {
  if (previousStoreProfile === undefined) {
    delete process.env.STORE_PROFILE;
    return;
  }

  process.env.STORE_PROFILE = previousStoreProfile;
}

describe("storefront profile isolation", () => {
  afterEach(() => {
    restoreStoreProfileEnv();
  });

  it("uses the default profile when STORE_PROFILE is missing", () => {
    delete process.env.STORE_PROFILE;

    const categories = listCategories();
    expect(categories).toHaveLength(1);
    expect(categories[0]?.templateKey).toBe("pc-components");
  });

  it.each<StoreProfile>(["prints-3d", "pc-components", "plant-seeds"])(
    "returns profile-scoped catalog and home content for %s",
    (profile) => {
      process.env.STORE_PROFILE = profile;

      const categories = listCategories();
      expect(categories).toHaveLength(1);
      expect(categories[0]?.templateKey).toBe(profile);

      const products = listCatalogProducts();
      expect(products.length).toBeGreaterThan(0);
      expect(products.every((entry) => entry.category?.templateKey === profile)).toBe(true);

      const home = getHomeContent(new Date("2026-03-10T10:00:00.000Z"));
      expect(home.news.length).toBeGreaterThan(0);
      expect(
        home.featuredProducts.every((featured) => products.some((entry) => entry.product.id === featured.id)),
      ).toBe(true);
    },
  );

  it("fails fast for invalid STORE_PROFILE values", () => {
    process.env.STORE_PROFILE = "invalid-profile";

    expect(() => listCategories()).toThrow(/Invalid STORE_PROFILE/);
  });
});
