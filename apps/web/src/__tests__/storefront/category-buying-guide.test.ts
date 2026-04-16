import { describe, expect, it } from "vitest";
import { getCategoryBuyingGuide } from "@/features/catalog/category-buying-guide";

describe("getCategoryBuyingGuide", () => {
  it("returns a guide for every plant category", () => {
    const slugs = [
      "plant-seeds",
      "grow-lights",
      "fertilizers",
      "substrates",
      "pots-and-containers",
      "tools-and-accessories",
    ];

    for (const slug of slugs) {
      const guide = getCategoryBuyingGuide(slug);
      expect(guide).not.toBeNull();
      expect(guide?.title.length).toBeGreaterThan(0);
      expect(guide?.tips.length).toBeGreaterThan(0);
    }
  });

  it("returns null for unknown categories", () => {
    expect(getCategoryBuyingGuide("unknown-category")).toBeNull();
  });
});
