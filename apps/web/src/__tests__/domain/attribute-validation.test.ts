import { describe, expect, it } from "vitest";
import { validateCategoryAttributeValues } from "@base-ecommerce/domain";

describe("category attribute validation", () => {
  it("accepts a valid 3D print attribute payload", () => {
    const result = validateCategoryAttributeValues("prints-3d", {
      material: "PLA",
      layer_height_mm: 0.2,
      infill_percent: 20,
      print_time_hours: 6.5,
    });

    expect(result.success).toBe(true);
  });

  it("rejects an invalid PC component payload", () => {
    const result = validateCategoryAttributeValues("pc-components", {
      socket: "AM5",
      form_factor: "EATX",
      wattage: -10,
    });

    expect(result.success).toBe(false);
  });

  it("rejects unknown attributes for strict typed schemas", () => {
    const result = validateCategoryAttributeValues("plant-seeds", {
      species: "Ocimum basilicum",
      sunlight: "full-sun",
      germination_days: 8,
      unknown_prop: "not allowed",
    });

    expect(result.success).toBe(false);
  });
});
