import { z } from "zod";
import { currencySchema, productStatusSchema, categoryTemplateKeySchema } from "@base-ecommerce/domain";

const productPayloadBaseSchema = z.object({
  categoryId: z.string().uuid(),
  categoryTemplateKey: categoryTemplateKeySchema,
  name: z.string().min(3).max(120),
  slug: z.string().min(3).max(160).regex(/^[a-z0-9-]+$/),
  description: z.string().max(4000).optional(),
  baseSku: z.string().min(3).max(64),
  status: productStatusSchema.default("draft"),
  currency: currencySchema.default("MXN"),
  priceCents: z.int().nonnegative(),
  compareAtPriceCents: z.int().nonnegative().optional(),
  tags: z.array(z.string().min(1).max(40)).max(12).default([]),
  attributeValues: z.record(z.string(), z.unknown()).default({}),
});

const addCompareAtRefinement = <
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

export const createProductInputSchema = productPayloadBaseSchema.superRefine(addCompareAtRefinement);
export type CreateProductInput = z.infer<typeof createProductInputSchema>;

export const updateProductInputSchema = productPayloadBaseSchema
  .partial()
  .extend({
    id: z.string().uuid(),
  })
  .superRefine(addCompareAtRefinement);
export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;

// Backward-compatible alias from Deliverable 01.
export const productInputSchema = createProductInputSchema;
export type ProductInput = CreateProductInput;

export function validateProductInput(input: unknown) {
  return productInputSchema.parse(input);
}
