import { z } from "zod";
import { currencySchema } from "../catalog/schemas";

export const couponTypeSchema = z.enum(["percentage", "fixed"]);
export type CouponType = z.infer<typeof couponTypeSchema>;

export const couponTargetSchema = z.literal("subtotal");
export type CouponTarget = z.infer<typeof couponTargetSchema>;

export const couponSchema = z
  .object({
    id: z.string().uuid(),
    code: z
      .string()
      .min(3)
      .max(32)
      .regex(/^[A-Z0-9_-]+$/),
    type: couponTypeSchema,
    target: couponTargetSchema.default("subtotal"),
    percentageOff: z.number().int().min(1).max(100).optional(),
    amountOffCents: z.number().int().positive().optional(),
    currency: currencySchema.optional(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    usageLimit: z.number().int().positive().optional(),
    perUserLimit: z.number().int().positive().optional(),
    usageCount: z.number().int().nonnegative().default(0),
    isActive: z.boolean().default(true),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .superRefine((coupon, ctx) => {
    if (coupon.type === "percentage" && typeof coupon.percentageOff !== "number") {
      ctx.addIssue({
        code: "custom",
        path: ["percentageOff"],
        message: "Percentage coupon requires percentageOff.",
      });
    }

    if (coupon.type === "percentage" && typeof coupon.amountOffCents === "number") {
      ctx.addIssue({
        code: "custom",
        path: ["amountOffCents"],
        message: "Percentage coupon cannot set amountOffCents.",
      });
    }

    if (coupon.type === "percentage" && coupon.currency) {
      ctx.addIssue({
        code: "custom",
        path: ["currency"],
        message: "Percentage coupon cannot set currency.",
      });
    }

    if (coupon.type === "fixed" && typeof coupon.amountOffCents !== "number") {
      ctx.addIssue({
        code: "custom",
        path: ["amountOffCents"],
        message: "Fixed coupon requires amountOffCents.",
      });
    }

    if (coupon.type === "fixed" && typeof coupon.percentageOff === "number") {
      ctx.addIssue({
        code: "custom",
        path: ["percentageOff"],
        message: "Fixed coupon cannot set percentageOff.",
      });
    }

    if (coupon.type === "fixed" && !coupon.currency) {
      ctx.addIssue({
        code: "custom",
        path: ["currency"],
        message: "Fixed coupon requires currency.",
      });
    }

    if (new Date(coupon.endsAt).getTime() <= new Date(coupon.startsAt).getTime()) {
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "endsAt must be after startsAt.",
      });
    }

    if (typeof coupon.usageLimit === "number" && coupon.usageCount > coupon.usageLimit) {
      ctx.addIssue({
        code: "custom",
        path: ["usageCount"],
        message: "usageCount cannot exceed usageLimit.",
      });
    }
  });
export type Coupon = z.infer<typeof couponSchema>;

export function isCouponWithinWindow(coupon: Coupon, now = new Date()) {
  const nowMillis = now.getTime();
  return nowMillis >= new Date(coupon.startsAt).getTime() && nowMillis <= new Date(coupon.endsAt).getTime();
}

export function hasCouponUsageAvailable(coupon: Coupon) {
  return typeof coupon.usageLimit !== "number" || coupon.usageCount < coupon.usageLimit;
}

export function isCouponApplicable(coupon: Coupon, now = new Date()) {
  return coupon.isActive && isCouponWithinWindow(coupon, now) && hasCouponUsageAvailable(coupon);
}

export function calculateCouponDiscountCents(coupon: Coupon, productsSubtotalCents: number) {
  if (productsSubtotalCents <= 0 || !isCouponApplicable(coupon)) {
    return 0;
  }

  if (coupon.type === "percentage") {
    const percentageOff = coupon.percentageOff ?? 0;
    return Math.floor((productsSubtotalCents * percentageOff) / 100);
  }

  const amountOffCents = coupon.amountOffCents ?? 0;
  return Math.min(productsSubtotalCents, amountOffCents);
}
