import { couponTypeSchema, currencySchema } from "@base-ecommerce/domain";
import { z } from "zod";

const couponPayloadBaseSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[A-Z0-9_-]+$/),
  type: couponTypeSchema,
  percentageOff: z.number().int().min(1).max(100).optional(),
  amountOffCents: z.number().int().positive().optional(),
  currency: currencySchema.optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  usageLimit: z.number().int().positive().optional(),
  isActive: z.boolean().default(true),
});

const refineCouponPayload = (
  coupon: {
    type?: "percentage" | "fixed" | undefined;
    percentageOff?: number | undefined;
    amountOffCents?: number | undefined;
    currency?: "MXN" | "USD" | undefined;
    startsAt?: string | undefined;
    endsAt?: string | undefined;
  },
  ctx: z.RefinementCtx,
) => {
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

  if (
    typeof coupon.startsAt === "string" &&
    typeof coupon.endsAt === "string" &&
    new Date(coupon.endsAt).getTime() <= new Date(coupon.startsAt).getTime()
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["endsAt"],
      message: "endsAt must be after startsAt.",
    });
  }
};

export const createCouponInputSchema = couponPayloadBaseSchema.superRefine((coupon, ctx) => {
  refineCouponPayload(coupon, ctx);
});
export type CreateCouponInput = z.infer<typeof createCouponInputSchema>;

export const updateCouponInputSchema = couponPayloadBaseSchema
  .partial()
  .extend({
    id: z.string().uuid(),
  })
  .superRefine((coupon, ctx) => {
    refineCouponPayload(coupon, ctx);
  });
export type UpdateCouponInput = z.infer<typeof updateCouponInputSchema>;
