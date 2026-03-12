import { describe, expect, it } from "vitest";
import { calculateCouponDiscountCents, couponSchema, isCouponApplicable } from "@base-ecommerce/domain";

const validPercentageCoupon = {
  id: "e1614ca0-194d-48f7-a77d-55f77f390f43",
  code: "SPRING10",
  type: "percentage" as const,
  target: "subtotal" as const,
  percentageOff: 10,
  startsAt: "2026-03-01T00:00:00.000Z",
  endsAt: "2026-03-31T23:59:59.000Z",
  usageLimit: 100,
  usageCount: 0,
  isActive: true,
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-01T00:00:00.000Z",
};

describe("coupon validation and applicability", () => {
  it("validates percentage coupons and discount calculation", () => {
    const coupon = couponSchema.parse(validPercentageCoupon);
    expect(calculateCouponDiscountCents(coupon, 10000)).toBe(1000);
  });

  it("rejects invalid type field combinations", () => {
    const invalid = couponSchema.safeParse({
      ...validPercentageCoupon,
      amountOffCents: 500,
    });
    expect(invalid.success).toBe(false);
  });

  it("rejects invalid date windows", () => {
    const invalid = couponSchema.safeParse({
      ...validPercentageCoupon,
      startsAt: "2026-04-01T00:00:00.000Z",
      endsAt: "2026-03-01T00:00:00.000Z",
    });
    expect(invalid.success).toBe(false);
  });

  it("applies active and usage-limit checks", () => {
    const exhaustedCoupon = couponSchema.parse({
      ...validPercentageCoupon,
      usageLimit: 1,
      usageCount: 1,
    });
    const inactiveCoupon = couponSchema.parse({
      ...validPercentageCoupon,
      isActive: false,
    });

    expect(isCouponApplicable(exhaustedCoupon, new Date("2026-03-10T00:00:00.000Z"))).toBe(false);
    expect(isCouponApplicable(inactiveCoupon, new Date("2026-03-10T00:00:00.000Z"))).toBe(false);
  });
});
