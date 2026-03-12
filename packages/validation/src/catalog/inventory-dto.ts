import { z } from "zod";
import { inventoryLedgerReasonSchema } from "@base-ecommerce/domain";

export const createInventoryLedgerEntryInputSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantityDelta: z.int(),
  reason: inventoryLedgerReasonSchema,
  reference: z.string().max(140).optional(),
});
export type CreateInventoryLedgerEntryInput = z.infer<typeof createInventoryLedgerEntryInputSchema>;

export const updateInventoryLedgerEntryInputSchema = z.object({
  id: z.string().uuid(),
  reason: inventoryLedgerReasonSchema.optional(),
  reference: z.string().max(140).optional(),
});
export type UpdateInventoryLedgerEntryInput = z.infer<typeof updateInventoryLedgerEntryInputSchema>;
