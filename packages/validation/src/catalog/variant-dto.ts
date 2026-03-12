import { z } from "zod";

const variantPayloadBaseSchema = z.object({
  productId: z.string().uuid(),
  sku: z.string().min(3).max(64),
  name: z.string().min(1).max(120),
  priceCents: z.int().nonnegative(),
  compareAtPriceCents: z.int().nonnegative().optional(),
  stockOnHand: z.int().nonnegative(),
  isDefault: z.boolean().default(false),
  attributeValues: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
});

const addVariantPriceRefinement = <
  T extends {
    priceCents?: number | undefined;
    compareAtPriceCents?: number | undefined;
  },
>(
  value: T,
  ctx: z.RefinementCtx,
) => {
  if (
    typeof value.priceCents === "number" &&
    typeof value.compareAtPriceCents === "number" &&
    value.compareAtPriceCents <= value.priceCents
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["compareAtPriceCents"],
      message: "compareAtPriceCents must be greater than priceCents.",
    });
  }
};

export const createVariantInputSchema = variantPayloadBaseSchema.superRefine(addVariantPriceRefinement);
export type CreateVariantInput = z.infer<typeof createVariantInputSchema>;

export const updateVariantInputSchema = variantPayloadBaseSchema
  .partial()
  .extend({
    id: z.string().uuid(),
  })
  .superRefine(addVariantPriceRefinement);
export type UpdateVariantInput = z.infer<typeof updateVariantInputSchema>;
