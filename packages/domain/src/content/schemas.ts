import { z } from "zod";

export const newsStatusSchema = z.enum(["draft", "published", "archived"]);
export type NewsStatus = z.infer<typeof newsStatusSchema>;

export const newsPostSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(3).max(140).regex(/^[a-z0-9-]+$/),
  title: z.string().min(3).max(180),
  summary: z.string().min(10).max(320),
  body: z.string().min(60).max(10000),
  status: newsStatusSchema,
  publishedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type NewsPost = z.infer<typeof newsPostSchema>;

export const promoBannerSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(3).max(120),
  subtitle: z.string().max(240).optional(),
  ctaLabel: z.string().min(2).max(30).optional(),
  ctaHref: z.string().max(240).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  isActive: z.boolean(),
});
export type PromoBanner = z.infer<typeof promoBannerSchema>;

export const featuredSaleSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(3).max(120),
  description: z.string().max(240).optional(),
  productIds: z.array(z.string().uuid()).min(1).max(24),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  isActive: z.boolean(),
});
export type FeaturedSale = z.infer<typeof featuredSaleSchema>;
