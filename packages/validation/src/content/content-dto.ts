import { z } from "zod";
import { newsStatusSchema } from "@base-ecommerce/domain";

const newsPayloadSchema = z.object({
  slug: z.string().min(3).max(140).regex(/^[a-z0-9-]+$/),
  title: z.string().min(3).max(180),
  summary: z.string().min(10).max(320),
  body: z.string().min(60).max(10000),
  status: newsStatusSchema.default("draft"),
  publishedAt: z.string().datetime().optional(),
});

export const createNewsPostInputSchema = newsPayloadSchema;
export type CreateNewsPostInput = z.infer<typeof createNewsPostInputSchema>;

export const updateNewsPostInputSchema = newsPayloadSchema.partial().extend({
  id: z.string().uuid(),
});
export type UpdateNewsPostInput = z.infer<typeof updateNewsPostInputSchema>;

const promoPayloadSchema = z.object({
  title: z.string().min(3).max(120),
  subtitle: z.string().max(240).optional(),
  ctaLabel: z.string().min(2).max(30).optional(),
  ctaHref: z.string().max(240).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  isActive: z.boolean().default(false),
});

export const createPromoBannerInputSchema = promoPayloadSchema;
export type CreatePromoBannerInput = z.infer<typeof createPromoBannerInputSchema>;

export const updatePromoBannerInputSchema = promoPayloadSchema.partial().extend({
  id: z.string().uuid(),
});
export type UpdatePromoBannerInput = z.infer<typeof updatePromoBannerInputSchema>;

const featuredSalePayloadSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(240).optional(),
  productIds: z.array(z.string().uuid()).min(1).max(24),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  isActive: z.boolean().default(false),
});

export const createFeaturedSaleInputSchema = featuredSalePayloadSchema;
export type CreateFeaturedSaleInput = z.infer<typeof createFeaturedSaleInputSchema>;

export const updateFeaturedSaleInputSchema = featuredSalePayloadSchema.partial().extend({
  id: z.string().uuid(),
});
export type UpdateFeaturedSaleInput = z.infer<typeof updateFeaturedSaleInputSchema>;
