import { describe, expect, it } from "vitest";
import { getPriceDisplay } from "@/features/catalog/pricing";

describe("product pricing display", () => {
  it("shows regular price when there is no valid compare-at price", () => {
    const display = getPriceDisplay(99900);
    expect(display.hasDiscount).toBe(false);
    expect(display.currentCents).toBe(99900);
    expect(display.discountPercent).toBe(0);
  });

  it("shows discounted price and percent when compare-at price is greater", () => {
    const display = getPriceDisplay(80000, 100000);
    expect(display.hasDiscount).toBe(true);
    expect(display.currentCents).toBe(80000);
    expect(display.compareAtCents).toBe(100000);
    expect(display.discountPercent).toBe(20);
  });
});
