import { z } from "zod";
import { categoryTemplateKeySchema } from "@base-ecommerce/domain";

export const createCategoryInputSchema = z.object({
  slug: z.string().min(3).max(120).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2).max(100),
  description: z.string().max(600).optional(),
  templateKey: categoryTemplateKeySchema,
});
export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

export const updateCategoryInputSchema = createCategoryInputSchema.partial().extend({
  id: z.string().uuid(),
});
export type UpdateCategoryInput = z.infer<typeof updateCategoryInputSchema>;
