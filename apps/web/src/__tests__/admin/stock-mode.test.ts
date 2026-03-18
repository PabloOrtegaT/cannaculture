import { describe, expect, it } from "vitest";
import { resolveVariantStockOnHand } from "@/server/admin/stock-mode";

describe("variant stock mode resolver", () => {
  it("sets absolute stock when using set mode", () => {
    expect(resolveVariantStockOnHand(2, "set", 7)).toBe(7);
  });

  it("adjusts stock by delta when using adjust mode", () => {
    expect(resolveVariantStockOnHand(2, "adjust", 2)).toBe(4);
    expect(resolveVariantStockOnHand(4, "adjust", -1)).toBe(3);
  });

  it("rejects adjustments that produce negative stock", () => {
    expect(() => resolveVariantStockOnHand(1, "adjust", -2)).toThrow("negative inventory");
  });

  it("rejects non-integer stock values", () => {
    expect(() => resolveVariantStockOnHand(1, "set", 1.5)).toThrow("integer");
  });
});
