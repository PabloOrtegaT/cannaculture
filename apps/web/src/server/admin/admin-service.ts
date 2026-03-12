import {
  categorySchema,
  couponSchema,
  getCategoryAttributeDefinitions,
  newsPostSchema,
  productSchema,
  productVariantSchema,
  promoBannerSchema,
  featuredSaleSchema,
  type Category,
  type Currency,
  type ProductStatus,
} from "@base-ecommerce/domain";
import {
  createCategoryInputSchema,
  createCouponInputSchema,
  createFeaturedSaleInputSchema,
  createNewsPostInputSchema,
  createProductInputSchema,
  createPromoBannerInputSchema,
  createVariantInputSchema,
  updateProductInputSchema,
  updateVariantInputSchema,
} from "@base-ecommerce/validation";
import type {
  AdminContentRow,
  AdminCouponRow,
  AdminOrderRow,
  AdminProductRow,
  AdminVariantRow,
  CsvImportResult,
  OrderStatusPoint,
  SalesTrendPoint,
  TopProductPoint,
} from "@/features/admin/types";
import { formatCurrencyCents } from "@/features/admin/format";
import { getActiveStoreProfile } from "@/server/config/store-profile";
import { parseProductCsv } from "./csv-import";
import { getProfileRuntimeStore } from "@/server/data/runtime-store";

function nowIso() {
  return new Date().toISOString();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

function ensureUniqueText(candidate: string, existing: Set<string>) {
  if (!existing.has(candidate)) {
    return candidate;
  }

  let suffix = 2;
  let next = `${candidate}-${suffix}`;
  while (existing.has(next)) {
    suffix += 1;
    next = `${candidate}-${suffix}`;
  }
  return next;
}

function getActiveProfileContext() {
  const profile = getActiveStoreProfile();
  const store = getProfileRuntimeStore(profile);
  const categoryById = new Map(store.categories.map((category) => [category.id, category]));
  const productById = new Map(store.products.map((product) => [product.id, product]));
  return { profile, store, categoryById, productById };
}

export function listAdminCategories() {
  const { store } = getActiveProfileContext();
  return store.categories.map((category) => ({
    ...category,
    attributeCount: getCategoryAttributeDefinitions(category.templateKey).length,
  }));
}

export function listAdminCategoryAttributes() {
  return listAdminCategories().map((category) => ({
    categoryId: category.id,
    categoryName: category.name,
    templateKey: category.templateKey,
    attributes: getCategoryAttributeDefinitions(category.templateKey),
  }));
}

export function createAdminCategory(input: { name: string; slug?: string }) {
  const { profile, store } = getActiveProfileContext();
  const slugCandidate = slugify(input.slug && input.slug.length > 0 ? input.slug : input.name);
  const existingSlugs = new Set(store.categories.map((category) => category.slug));
  const slug = ensureUniqueText(slugCandidate, existingSlugs);
  const parsed = createCategoryInputSchema.parse({
    slug,
    name: input.name.trim(),
    templateKey: profile,
  });

  const category = categorySchema.parse({
    id: crypto.randomUUID(),
    ...parsed,
  });

  store.categories.push(category);
  return category;
}

export function listAdminProducts(): AdminProductRow[] {
  const { store, categoryById } = getActiveProfileContext();
  const variantsByProductId = store.variants.reduce(
    (accumulator, variant) => {
      const existing = accumulator.get(variant.productId) ?? [];
      existing.push(variant);
      accumulator.set(variant.productId, existing);
      return accumulator;
    },
    new Map<string, typeof store.variants>(),
  );

  return store.products.map((product) => {
    const variants = variantsByProductId.get(product.id) ?? [];
    const stockOnHand = variants.reduce((sum, variant) => sum + variant.stockOnHand, 0);
    const category = categoryById.get(product.categoryId);

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      status: product.status,
      categoryName: category?.name ?? "Unknown",
      categorySlug: category?.slug ?? "unknown",
      priceCents: product.priceCents,
      currency: product.currency,
      stockOnHand,
      variantCount: variants.length,
      updatedAt: product.updatedAt,
    };
  });
}

export function listAdminVariants(): AdminVariantRow[] {
  const { store, productById } = getActiveProfileContext();
  return store.variants.map((variant) => {
    const product = productById.get(variant.productId);
    return {
      id: variant.id,
      productId: variant.productId,
      productName: product?.name ?? "Unknown product",
      sku: variant.sku,
      name: variant.name,
      priceCents: variant.priceCents,
      currency: product?.currency ?? "MXN",
      stockOnHand: variant.stockOnHand,
      isDefault: variant.isDefault,
      updatedAt: variant.updatedAt,
    };
  });
}

export function listAdminContentRows(): AdminContentRow[] {
  const { store } = getActiveProfileContext();

  const newsRows: AdminContentRow[] = store.newsPosts.map((news) => ({
    id: news.id,
    type: "news",
    title: news.title,
    status: news.status,
    updatedAt: news.updatedAt,
  }));

  const bannerRows: AdminContentRow[] = store.promoBanners.map((banner) => ({
    id: banner.id,
    type: "banner",
    title: banner.title,
    status: banner.isActive ? "active" : "inactive",
    startsAt: banner.startsAt,
    endsAt: banner.endsAt,
    updatedAt: banner.endsAt,
  }));

  const featuredRows: AdminContentRow[] = store.featuredSales.map((featured) => ({
    id: featured.id,
    type: "featured",
    title: featured.title,
    status: featured.isActive ? "active" : "inactive",
    startsAt: featured.startsAt,
    endsAt: featured.endsAt,
    updatedAt: featured.endsAt,
  }));

  return [...newsRows, ...bannerRows, ...featuredRows];
}

export function listAdminNewsPosts() {
  const { store } = getActiveProfileContext();
  return store.newsPosts;
}

export function listAdminPromoBanners() {
  const { store } = getActiveProfileContext();
  return store.promoBanners;
}

export function listAdminFeaturedSales() {
  const { store } = getActiveProfileContext();
  return store.featuredSales;
}

export function listAdminCoupons(): AdminCouponRow[] {
  const { store } = getActiveProfileContext();
  return store.coupons.map((coupon) => {
    const valueLabel =
      coupon.type === "percentage"
        ? `${coupon.percentageOff ?? 0}%`
        : formatCurrencyCents(coupon.amountOffCents ?? 0, coupon.currency ?? "MXN");

    return {
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      valueLabel,
      target: coupon.target,
      isActive: coupon.isActive,
      ...(typeof coupon.usageLimit === "number" ? { usageLimit: coupon.usageLimit } : {}),
      usageCount: coupon.usageCount,
      startsAt: coupon.startsAt,
      endsAt: coupon.endsAt,
    };
  });
}

export function listAdminOrders(): AdminOrderRow[] {
  const { store } = getActiveProfileContext();
  return store.orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    totalCents: order.totalCents,
    currency: order.currency,
    itemCount: order.itemCount,
    productLabel: order.productLabel,
    createdAt: order.createdAt,
  }));
}

export function listAdminDashboardAnalytics() {
  const orders = listAdminOrders();

  const salesByDate = orders.reduce<Map<string, number>>((accumulator, order) => {
    const date = order.createdAt.slice(0, 10);
    const current = accumulator.get(date) ?? 0;
    accumulator.set(date, current + order.totalCents);
    return accumulator;
  }, new Map());
  const salesTrend: SalesTrendPoint[] = Array.from(salesByDate.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, totalCents]) => ({ date, totalCents }));

  const revenueByProduct = orders.reduce<Map<string, number>>((accumulator, order) => {
    const current = accumulator.get(order.productLabel) ?? 0;
    accumulator.set(order.productLabel, current + order.totalCents);
    return accumulator;
  }, new Map());
  const topProducts: TopProductPoint[] = Array.from(revenueByProduct.entries())
    .map(([name, revenueCents]) => ({ name, revenueCents }))
    .sort((left, right) => right.revenueCents - left.revenueCents)
    .slice(0, 5);

  const statusCounts = orders.reduce<Map<AdminOrderRow["status"], number>>((accumulator, order) => {
    const current = accumulator.get(order.status) ?? 0;
    accumulator.set(order.status, current + 1);
    return accumulator;
  }, new Map());
  const orderStatus: OrderStatusPoint[] = Array.from(statusCounts.entries()).map(([status, count]) => ({ status, count }));

  return {
    salesTrend,
    topProducts,
    orderStatus,
  };
}

export function createAdminProduct(input: {
  name: string;
  categoryId: string;
  priceCents: number;
  stockOnHand: number;
  currency: Currency;
  status: ProductStatus;
}) {
  const { store, categoryById } = getActiveProfileContext();
  const category = categoryById.get(input.categoryId);
  if (!category) {
    throw new Error("Category not found.");
  }

  const existingProductSlugs = new Set(store.products.map((product) => product.slug));
  const existingSkus = new Set(store.products.map((product) => product.baseSku));

  const slug = ensureUniqueText(slugify(input.name), existingProductSlugs);
  const baseSku = ensureUniqueText(slug.toUpperCase().replace(/-/g, "_"), existingSkus);

  createProductInputSchema.parse({
    categoryId: category.id,
    categoryTemplateKey: category.templateKey,
    name: input.name,
    slug,
    baseSku,
    status: input.status,
    currency: input.currency,
    priceCents: input.priceCents,
    attributeValues: {},
    tags: [],
  });

  const createdAt = nowIso();
  const product = productSchema.parse({
    id: crypto.randomUUID(),
    categoryId: category.id,
    name: input.name.trim(),
    slug,
    description: undefined,
    baseSku,
    status: input.status,
    currency: input.currency,
    priceCents: input.priceCents,
    compareAtPriceCents: undefined,
    tags: [],
    createdAt,
    updatedAt: createdAt,
  });
  store.products.push(product);

  const variant = productVariantSchema.parse({
    id: crypto.randomUUID(),
    productId: product.id,
    sku: `${baseSku}_DEFAULT`,
    name: "Default",
    priceCents: input.priceCents,
    compareAtPriceCents: undefined,
    stockOnHand: input.stockOnHand,
    isDefault: true,
    attributeValues: {},
    createdAt,
    updatedAt: createdAt,
  });
  store.variants.push(variant);

  return product;
}

export function updateAdminProduct(input: {
  id: string;
  name: string;
  priceCents: number;
  status: ProductStatus;
}) {
  const { store, categoryById } = getActiveProfileContext();
  const productIndex = store.products.findIndex((product) => product.id === input.id);
  if (productIndex < 0) {
    throw new Error("Product not found.");
  }

  const currentProduct = store.products[productIndex];
  if (!currentProduct) {
    throw new Error("Product not found.");
  }
  const category = categoryById.get(currentProduct.categoryId);
  if (!category) {
    throw new Error("Category not found.");
  }

  updateProductInputSchema.parse({
    id: currentProduct.id,
    categoryId: category.id,
    categoryTemplateKey: category.templateKey,
    name: input.name,
    status: input.status,
    priceCents: input.priceCents,
  });

  const updatedAt = nowIso();
  const nextProduct = productSchema.parse({
    ...currentProduct,
    name: input.name.trim(),
    status: input.status,
    priceCents: input.priceCents,
    updatedAt,
  });
  store.products[productIndex] = nextProduct;

  const defaultVariantIndex = store.variants.findIndex(
    (variant) => variant.productId === currentProduct.id && variant.isDefault,
  );
  if (defaultVariantIndex >= 0) {
    const defaultVariant = store.variants[defaultVariantIndex];
    if (!defaultVariant) {
      return nextProduct;
    }
    store.variants[defaultVariantIndex] = productVariantSchema.parse({
      ...defaultVariant,
      priceCents: input.priceCents,
      updatedAt,
    });
  }

  return nextProduct;
}

export function createAdminVariant(input: {
  productId: string;
  name: string;
  priceCents: number;
  stockOnHand: number;
  isDefault: boolean;
}) {
  const { store, productById } = getActiveProfileContext();
  const product = productById.get(input.productId);
  if (!product) {
    throw new Error("Product not found.");
  }

  const existingVariantSkus = new Set(store.variants.map((variant) => variant.sku));
  const skuCandidate = `${product.baseSku}_${slugify(input.name).toUpperCase().replace(/-/g, "_")}`;
  const sku = ensureUniqueText(skuCandidate, existingVariantSkus);

  createVariantInputSchema.parse({
    productId: product.id,
    sku,
    name: input.name,
    priceCents: input.priceCents,
    stockOnHand: input.stockOnHand,
    isDefault: input.isDefault,
    attributeValues: {},
  });

  if (input.isDefault) {
    store.variants = store.variants.map((variant) =>
      variant.productId === product.id ? { ...variant, isDefault: false } : variant,
    );
  }

  const createdAt = nowIso();
  const variant = productVariantSchema.parse({
    id: crypto.randomUUID(),
    productId: product.id,
    sku,
    name: input.name.trim(),
    priceCents: input.priceCents,
    compareAtPriceCents: undefined,
    stockOnHand: input.stockOnHand,
    isDefault: input.isDefault,
    attributeValues: {},
    createdAt,
    updatedAt: createdAt,
  });

  store.variants.push(variant);
  return variant;
}

export function updateAdminVariant(input: {
  id: string;
  name: string;
  priceCents: number;
  stockOnHand: number;
  isDefault: boolean;
}) {
  const { store } = getActiveProfileContext();
  const variantIndex = store.variants.findIndex((variant) => variant.id === input.id);
  if (variantIndex < 0) {
    throw new Error("Variant not found.");
  }

  const currentVariant = store.variants[variantIndex];
  if (!currentVariant) {
    throw new Error("Variant not found.");
  }
  updateVariantInputSchema.parse({
    id: currentVariant.id,
    name: input.name,
    priceCents: input.priceCents,
    stockOnHand: input.stockOnHand,
    isDefault: input.isDefault,
  });

  if (input.isDefault) {
    store.variants = store.variants.map((variant) =>
      variant.productId === currentVariant.productId ? { ...variant, isDefault: false } : variant,
    );
  }

  const updatedVariant = productVariantSchema.parse({
    ...currentVariant,
    name: input.name.trim(),
    priceCents: input.priceCents,
    stockOnHand: input.stockOnHand,
    isDefault: input.isDefault,
    updatedAt: nowIso(),
  });
  store.variants[variantIndex] = updatedVariant;

  return updatedVariant;
}

export function createAdminNewsPost(input: {
  title: string;
  summary: string;
  body: string;
  status: "draft" | "published" | "archived";
}) {
  const { store } = getActiveProfileContext();
  const existingSlugs = new Set(store.newsPosts.map((news) => news.slug));
  const slug = ensureUniqueText(slugify(input.title), existingSlugs);
  const now = nowIso();

  createNewsPostInputSchema.parse({
    slug,
    title: input.title,
    summary: input.summary,
    body: input.body,
    status: input.status,
    publishedAt: input.status === "published" ? now : undefined,
  });

  const news = newsPostSchema.parse({
    id: crypto.randomUUID(),
    slug,
    title: input.title.trim(),
    summary: input.summary.trim(),
    body: input.body.trim(),
    status: input.status,
    publishedAt: input.status === "published" ? now : undefined,
    createdAt: now,
    updatedAt: now,
  });
  store.newsPosts.push(news);
  return news;
}

export function setAdminNewsStatus(newsId: string, status: "draft" | "published" | "archived") {
  const { store } = getActiveProfileContext();
  const index = store.newsPosts.findIndex((news) => news.id === newsId);
  if (index < 0) {
    throw new Error("News item not found.");
  }

  const current = store.newsPosts[index];
  if (!current) {
    throw new Error("News item not found.");
  }
  const now = nowIso();
  store.newsPosts[index] = newsPostSchema.parse({
    ...current,
    status,
    publishedAt: status === "published" ? current.publishedAt ?? now : undefined,
    updatedAt: now,
  });
}

export function createAdminPromoBanner(input: {
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}) {
  const { store } = getActiveProfileContext();
  createPromoBannerInputSchema.parse(input);

  const banner = promoBannerSchema.parse({
    id: crypto.randomUUID(),
    title: input.title.trim(),
    subtitle: input.subtitle,
    ctaLabel: input.ctaLabel,
    ctaHref: input.ctaHref,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    isActive: input.isActive,
  });
  store.promoBanners.push(banner);
  return banner;
}

export function setAdminPromoBannerActive(bannerId: string, isActive: boolean) {
  const { store } = getActiveProfileContext();
  const index = store.promoBanners.findIndex((banner) => banner.id === bannerId);
  if (index < 0) {
    throw new Error("Promo banner not found.");
  }

  store.promoBanners[index] = promoBannerSchema.parse({
    ...store.promoBanners[index],
    isActive,
  });
}

export function createAdminFeaturedSale(input: {
  title: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  productIds: string[];
}) {
  const { store } = getActiveProfileContext();
  createFeaturedSaleInputSchema.parse(input);

  const featured = featuredSaleSchema.parse({
    id: crypto.randomUUID(),
    title: input.title.trim(),
    description: input.description?.trim(),
    productIds: input.productIds,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    isActive: input.isActive,
  });
  store.featuredSales.push(featured);
  return featured;
}

export function setAdminFeaturedSaleActive(featuredSaleId: string, isActive: boolean) {
  const { store } = getActiveProfileContext();
  const index = store.featuredSales.findIndex((featured) => featured.id === featuredSaleId);
  if (index < 0) {
    throw new Error("Featured sale not found.");
  }

  store.featuredSales[index] = featuredSaleSchema.parse({
    ...store.featuredSales[index],
    isActive,
  });
}

export function createAdminCoupon(input: {
  code: string;
  type: "percentage" | "fixed";
  percentageOff?: number;
  amountOffCents?: number;
  currency?: Currency;
  startsAt: string;
  endsAt: string;
  usageLimit?: number;
  isActive: boolean;
}) {
  const { store } = getActiveProfileContext();
  const parsed = createCouponInputSchema.parse({
    ...input,
    code: input.code.toUpperCase(),
  });
  const now = nowIso();

  const coupon = couponSchema.parse({
    id: crypto.randomUUID(),
    code: parsed.code,
    type: parsed.type,
    target: "subtotal",
    percentageOff: parsed.percentageOff,
    amountOffCents: parsed.amountOffCents,
    currency: parsed.currency,
    startsAt: parsed.startsAt,
    endsAt: parsed.endsAt,
    usageLimit: parsed.usageLimit,
    usageCount: 0,
    isActive: parsed.isActive,
    createdAt: now,
    updatedAt: now,
  });

  store.coupons.push(coupon);
  return coupon;
}

export function setAdminCouponActive(couponId: string, isActive: boolean) {
  const { store } = getActiveProfileContext();
  const index = store.coupons.findIndex((coupon) => coupon.id === couponId);
  if (index < 0) {
    throw new Error("Coupon not found.");
  }

  const currentCoupon = store.coupons[index];
  const updatedCoupon = couponSchema.parse({
    ...currentCoupon,
    isActive,
    updatedAt: nowIso(),
  });
  store.coupons[index] = updatedCoupon;
  return updatedCoupon;
}

function createProductFromCsvRow(input: {
  name: string;
  slug: string;
  baseSku: string;
  category: Category;
  status: ProductStatus;
  currency: Currency;
  priceCents: number;
  stockOnHand: number;
}) {
  const { store } = getActiveProfileContext();
  const now = nowIso();
  const product = productSchema.parse({
    id: crypto.randomUUID(),
    categoryId: input.category.id,
    name: input.name,
    slug: input.slug,
    description: undefined,
    baseSku: input.baseSku,
    status: input.status,
    currency: input.currency,
    priceCents: input.priceCents,
    compareAtPriceCents: undefined,
    tags: [],
    createdAt: now,
    updatedAt: now,
  });

  const variant = productVariantSchema.parse({
    id: crypto.randomUUID(),
    productId: product.id,
    sku: `${input.baseSku}_DEFAULT`,
    name: "Default",
    priceCents: input.priceCents,
    compareAtPriceCents: undefined,
    stockOnHand: input.stockOnHand,
    isDefault: true,
    attributeValues: {},
    createdAt: now,
    updatedAt: now,
  });

  store.products.push(product);
  store.variants.push(variant);
}

function toRowValueStrings(row: {
  name: string;
  slug: string;
  baseSku: string;
  categorySlug: string;
  status: string;
  currency: string;
  priceCents: number;
  stockOnHand: number;
}) {
  return {
    name: row.name,
    slug: row.slug,
    baseSku: row.baseSku,
    categorySlug: row.categorySlug,
    status: row.status,
    currency: row.currency,
    priceCents: String(row.priceCents),
    stockOnHand: String(row.stockOnHand),
  };
}

export function importAdminCatalogFromCsv(csvText: string): CsvImportResult {
  const { store } = getActiveProfileContext();
  const parsed = parseProductCsv(csvText);
  const errors = [...parsed.errors];
  let importedProducts = 0;
  let importedVariants = 0;

  const existingSlugs = new Set(store.products.map((product) => product.slug));
  const existingSkus = new Set(store.products.map((product) => product.baseSku));

  parsed.rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const category = store.categories.find((entry) => entry.slug === row.categorySlug);
    if (!category) {
      errors.push({
        rowNumber,
        reason: `Unknown categorySlug "${row.categorySlug}" for active profile.`,
        rowValues: toRowValueStrings(row),
      });
      return;
    }

    if (existingSlugs.has(row.slug)) {
      errors.push({
        rowNumber,
        reason: `Duplicate slug "${row.slug}".`,
        rowValues: toRowValueStrings(row),
      });
      return;
    }

    if (existingSkus.has(row.baseSku)) {
      errors.push({
        rowNumber,
        reason: `Duplicate baseSku "${row.baseSku}".`,
        rowValues: toRowValueStrings(row),
      });
      return;
    }

    createProductFromCsvRow({
      name: row.name,
      slug: row.slug,
      baseSku: row.baseSku,
      category,
      status: row.status,
      currency: row.currency,
      priceCents: row.priceCents,
      stockOnHand: row.stockOnHand,
    });

    existingSlugs.add(row.slug);
    existingSkus.add(row.baseSku);
    importedProducts += 1;
    importedVariants += 1;
  });

  return {
    importedProducts,
    importedVariants,
    errors,
  };
}
