import { z } from "zod";

export const currencySchema = z.enum(["MXN", "USD"]);
export type Currency = z.infer<typeof currencySchema>;

export const productStatusSchema = z.enum(["draft", "active", "archived"]);
export type ProductStatus = z.infer<typeof productStatusSchema>;

export const categoryTemplateKeySchema = z.enum(["prints-3d", "pc-components", "plant-seeds"]);
export type CategoryTemplateKey = z.infer<typeof categoryTemplateKeySchema>;

export const attributeValueTypeSchema = z.enum(["string", "number", "boolean", "enum"]);
export type AttributeValueType = z.infer<typeof attributeValueTypeSchema>;

export const attributeValueSchema = z.union([z.string(), z.number(), z.boolean()]);
export type AttributeValue = z.infer<typeof attributeValueSchema>;

export const attributeDefinitionSchema = z
  .object({
    key: z.string().min(2).max(64).regex(/^[a-z0-9_]+$/),
    label: z.string().min(2).max(80),
    type: attributeValueTypeSchema,
    required: z.boolean().default(false),
    options: z.array(z.string().min(1).max(60)).min(1).optional(),
    unit: z.string().min(1).max(20).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "enum" && (!value.options || value.options.length === 0)) {
      ctx.addIssue({
        code: "custom",
        message: "Enum attributes must define at least one option.",
        path: ["options"],
      });
    }

    if (typeof value.min === "number" && typeof value.max === "number" && value.min > value.max) {
      ctx.addIssue({
        code: "custom",
        message: "Attribute min cannot be greater than max.",
        path: ["min"],
      });
    }
  });
export type AttributeDefinition = z.infer<typeof attributeDefinitionSchema>;

export const categorySchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(3).max(120).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2).max(100),
  description: z.string().max(600).optional(),
  templateKey: categoryTemplateKeySchema,
});
export type Category = z.infer<typeof categorySchema>;

const ensureCompareAtGreaterThanPrice = (
  value: { priceCents: number; compareAtPriceCents?: number | undefined },
  ctx: z.RefinementCtx,
) => {
  if (typeof value.compareAtPriceCents === "number" && value.compareAtPriceCents <= value.priceCents) {
    ctx.addIssue({
      code: "custom",
      path: ["compareAtPriceCents"],
      message: "compareAtPriceCents must be greater than priceCents.",
    });
  }
};

export const productSchema = z
  .object({
    id: z.string().uuid(),
    categoryId: z.string().uuid(),
    name: z.string().min(3).max(120),
    slug: z.string().min(3).max(160).regex(/^[a-z0-9-]+$/),
    description: z.string().max(4000).optional(),
    baseSku: z.string().min(3).max(64),
    status: productStatusSchema,
    currency: currencySchema,
    priceCents: z.int().nonnegative(),
    compareAtPriceCents: z.int().nonnegative().optional(),
    tags: z.array(z.string().min(1).max(40)).max(12).default([]),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .superRefine(ensureCompareAtGreaterThanPrice);
export type Product = z.infer<typeof productSchema>;

export const productVariantSchema = z
  .object({
    id: z.string().uuid(),
    productId: z.string().uuid(),
    sku: z.string().min(3).max(64),
    name: z.string().min(1).max(120),
    priceCents: z.int().nonnegative(),
    compareAtPriceCents: z.int().nonnegative().optional(),
    stockOnHand: z.int().nonnegative(),
    isDefault: z.boolean().default(false),
    attributeValues: z.record(z.string(), attributeValueSchema).default({}),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .superRefine(ensureCompareAtGreaterThanPrice);
export type ProductVariant = z.infer<typeof productVariantSchema>;

export const inventoryLedgerReasonSchema = z.enum([
  "initial_stock",
  "purchase",
  "manual_adjustment",
  "return",
  "cancellation",
  "restock",
]);
export type InventoryLedgerReason = z.infer<typeof inventoryLedgerReasonSchema>;

export const inventoryLedgerEntrySchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantityDelta: z.int(),
  reason: inventoryLedgerReasonSchema,
  reference: z.string().max(140).optional(),
  createdAt: z.string().datetime(),
});
export type InventoryLedgerEntry = z.infer<typeof inventoryLedgerEntrySchema>;
