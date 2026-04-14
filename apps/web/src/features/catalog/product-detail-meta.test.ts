import { describe, expect, it } from "vitest";
import { getProductDetailMeta } from "./product-detail-meta";

describe("getProductDetailMeta", () => {
  it("returns seed-packet meta with badges, hero lines, specs and tips", () => {
    const result = getProductDetailMeta("seed-packet", {
      species: "Solanum lycopersicum",
      sunlight: "full-sun",
      germination_days: 7,
      seasonality: "spring",
      is_heirloom: true,
    });

    expect(result.badges).toContain("Heirloom variety");
    expect(result.heroLines).toContain("Solanum lycopersicum");
    expect(result.heroLines).toContain("Germinates in 7 days");
    expect(result.heroLines).toContain("Sunlight: Full Sun");
    expect(result.specs).toEqual(
      expect.arrayContaining([
        { key: "species", label: "Species", value: "Solanum lycopersicum" },
        { key: "sunlight", label: "Sunlight", value: "Full Sun" },
        { key: "germination_days", label: "Germination (days)", value: "7" },
        { key: "seasonality", label: "Seasonality", value: "Spring" },
        { key: "is_heirloom", label: "Heirloom", value: "Yes" },
      ]),
    );
    expect(result.tips).toContain("Best sown in Spring.");
    expect(result.tips).toContain("Keep soil evenly moist until seedlings emerge.");
  });

  it("returns grow-light meta with dimmable badge", () => {
    const result = getProductDetailMeta("grow-light", {
      wattage: 100,
      spectrum: "full-spectrum",
      coverage_area_m2: 2.5,
      dimmable: true,
    });

    expect(result.badges).toContain("Dimmable");
    expect(result.heroLines).toContain("100W");
    expect(result.heroLines).toContain("Spectrum: Full Spectrum");
    expect(result.heroLines).toContain("Covers 2.5 m²");
    expect(result.tips).toContain("Dim during seedling stage to avoid light stress.");
  });

  it("returns fertilizer meta with organic badge", () => {
    const result = getProductDetailMeta("fertilizer", {
      npk_ratio: "10-10-10",
      form: "liquid",
      volume_ml: 500,
      organic: true,
      frequency_days: 14,
    });

    expect(result.badges).toContain("Organic");
    expect(result.heroLines).toContain("NPK 10-10-10");
    expect(result.heroLines).toContain("Form: Liquid");
    expect(result.tips).toContain(
      "Dilute to the recommended strength before applying to roots or foliage.",
    );
    expect(result.tips).toContain("Feed every 14 days for best results.");
  });

  it("returns substrate meta with sterilized badge", () => {
    const result = getProductDetailMeta("substrate", {
      composition: "coco-coir",
      volume_l: 10,
      drainage: "high",
      sterilized: true,
    });

    expect(result.badges).toContain("Sterilized");
    expect(result.heroLines).toContain("Composition: Coco Coir");
    expect(result.heroLines).toContain("10 L");
    expect(result.heroLines).toContain("Drainage: High");
  });

  it("returns pot-container meta with drainage and reusable badges", () => {
    const result = getProductDetailMeta("pot-container", {
      material: "terracotta",
      diameter_cm: 15,
      has_drainage: true,
      reusable: true,
    });

    expect(result.badges).toContain("Drainage holes");
    expect(result.badges).toContain("Reusable");
    expect(result.heroLines).toContain("Material: Terracotta");
    expect(result.heroLines).toContain("Diameter: 15 cm");
  });

  it("returns tool-accessory meta with ergonomic badge", () => {
    const result = getProductDetailMeta("tool-accessory", {
      tool_type: "pruner",
      material: "stainless-steel",
      length_cm: 20,
      ergonomic: true,
      warranty_months: 12,
    });

    expect(result.badges).toContain("Ergonomic grip");
    expect(result.heroLines).toContain("Type: Pruner");
    expect(result.heroLines).toContain("Material: Stainless Steel");
    expect(result.heroLines).toContain("Length: 20 cm");
    expect(result.tips).toContain("Warranty: 12 months.");
  });

  it("skips undefined/null attributes in specs", () => {
    const result = getProductDetailMeta("seed-packet", {
      species: "Basilicum",
      sunlight: "full-sun",
    });

    expect(result.specs).toEqual([
      { key: "species", label: "Species", value: "Basilicum" },
      { key: "sunlight", label: "Sunlight", value: "Full Sun" },
    ]);
  });

  it("returns empty arrays for unknown template keys", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = getProductDetailMeta("unknown" as any, { foo: "bar" });
    expect(result.badges).toEqual([]);
    expect(result.heroLines).toEqual([]);
    expect(result.specs).toEqual([]);
    expect(result.tips).toEqual([]);
  });
});
