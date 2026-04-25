"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  categoryTemplateKeySchema,
  couponTypeSchema,
  currencySchema,
  newsStatusSchema,
  productStatusSchema,
} from "@cannaculture/domain";
import {
  createAdminCategory,
  createAdminCoupon,
  createAdminFeaturedSale,
  createAdminNewsPost,
  createAdminProduct,
  createAdminPromoBanner,
  createAdminVariant,
  getAdminProductTemplateKey,
  listAdminVariants,
  setAdminCouponActive,
  setAdminFeaturedSaleActive,
  setAdminNewsStatus,
  setAdminPromoBannerActive,
  updateAdminCategory,
  updateAdminProduct,
  updateAdminVariant,
} from "@/server/admin/admin-service";
import { parseVariantFormAttributeValues } from "@/server/admin/variant-attributes";
import { logAdminAuditEvent } from "@/server/admin/audit-log";
import { createAdminMutationError, mapAdminMutationError } from "@/server/admin/mutation-errors";
import { ensurePermission } from "@/server/admin/role-guard";
import type { AdminVariantStockMode } from "@/server/admin/stock-mode";
import { getSessionUser } from "@/server/auth/session";
import { setFlashToast } from "@/server/feedback/flash-toast";
import {
  syncInventoryFromRuntimeCatalogForProduct,
  syncInventoryFromRuntimeCatalogForVariant,
} from "@/server/inventory/service";
import { enforceRateLimit, getClientIpFromHeaders } from "@/server/security/rate-limit";

type MutationConfig = {
  action: string;
  successMessage: string;
  redirectPath: string;
  run: () => void | Promise<void>;
};

async function runAdminMutation(config: MutationConfig) {
  const actor = await getSessionUser().catch(() => null);
  const requestHeaders = await headers();
  const clientIp = getClientIpFromHeaders(requestHeaders);
  const rateLimitKey = actor ? `admin:mutation:${actor.id}` : `admin:mutation:${clientIp}`;
  const rateLimit = await enforceRateLimit({
    key: rateLimitKey,
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    await setFlashToast({
      type: "error",
      code: "rate_limited",
      message: "Too many admin actions. Please wait and try again.",
    });
    logAdminAuditEvent({
      action: config.action,
      outcome: "failure",
      actorId: actor?.id ?? null,
      actorRole: actor?.role ?? null,
      code: "rate_limited",
      message: "Too many admin actions. Please wait and try again.",
    });
    redirect(config.redirectPath);
  }

  try {
    await config.run();
    revalidateAdminAndStorefrontPaths();
    await setFlashToast({
      type: "success",
      code: "success",
      message: config.successMessage,
    });
    logAdminAuditEvent({
      action: config.action,
      outcome: "success",
      actorId: actor?.id ?? null,
      actorRole: actor?.role ?? null,
      code: "success",
      message: config.successMessage,
    });
  } catch (error) {
    const feedback = mapAdminMutationError(error);
    await setFlashToast({
      type: "error",
      code: feedback.code,
      message: feedback.message,
    });
    logAdminAuditEvent({
      action: config.action,
      outcome: "failure",
      actorId: actor?.id ?? null,
      actorRole: actor?.role ?? null,
      code: feedback.code,
      message: feedback.message,
    });
  }

  redirect(config.redirectPath);
}

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createAdminMutationError("validation", `Missing required field "${key}".`);
  }
  return value.trim();
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length === 0 ? undefined : normalized;
}

function getRequiredNumber(formData: FormData, key: string) {
  const value = Number(getRequiredString(formData, key));
  if (Number.isNaN(value)) {
    throw createAdminMutationError("validation", `Field "${key}" must be a valid number.`);
  }
  return value;
}

function getOptionalNumber(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);
  if (!value) {
    return undefined;
  }

  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    throw createAdminMutationError("validation", `Field "${key}" must be a valid number.`);
  }
  return numeric;
}

function getStockMode(formData: FormData, key: string): AdminVariantStockMode {
  const value = getRequiredString(formData, key);
  if (value !== "set" && value !== "adjust") {
    throw createAdminMutationError("validation", "Invalid stock mode.");
  }
  return value;
}

function isChecked(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function parseVariantAttributesFromForm(formData: FormData, productId: string) {
  const templateKey = getAdminProductTemplateKey(productId);
  if (!templateKey) {
    return undefined;
  }
  return parseVariantFormAttributeValues(formData, templateKey);
}

function parseTagList(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function getOptionalAdminRedirectPath(formData: FormData) {
  const redirectTo = getOptionalString(formData, "redirectTo");
  if (!redirectTo) {
    return undefined;
  }
  if (!redirectTo.startsWith("/admin")) {
    throw createAdminMutationError("validation", 'Invalid "redirectTo" target.');
  }

  if (redirectTo.includes("..") || redirectTo.includes("?") || redirectTo.includes("#")) {
    throw createAdminMutationError("validation", 'Invalid "redirectTo" target.');
  }

  const normalized = redirectTo === "/admin" ? redirectTo : redirectTo.replace(/\/+$/, "");
  if (normalized !== "/admin" && !normalized.startsWith("/admin/")) {
    throw createAdminMutationError("validation", 'Invalid "redirectTo" target.');
  }
  return normalized;
}

function revalidateAdminAndStorefrontPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  revalidatePath("/admin/content");
  revalidatePath("/admin/coupons");
  revalidatePath("/");
  revalidatePath("/catalog");
}

export async function createCategoryAction(formData: FormData) {
  return runAdminMutation({
    action: "category.create",
    redirectPath: "/admin/categories",
    successMessage: "Category created.",
    run: async () => {
      await ensurePermission("catalog:write");
      const slug = getRequiredString(formData, "slug");
      const description = getOptionalString(formData, "description");
      createAdminCategory({
        name: getRequiredString(formData, "name"),
        templateKey: categoryTemplateKeySchema.parse(getRequiredString(formData, "templateKey")),
        slug,
        ...(description ? { description } : {}),
      });
    },
  });
}

export async function updateCategoryAction(formData: FormData) {
  return runAdminMutation({
    action: "category.update",
    redirectPath: "/admin/categories",
    successMessage: "Category updated.",
    run: async () => {
      await ensurePermission("catalog:write");
      const description = getOptionalString(formData, "description");
      updateAdminCategory({
        id: z.string().uuid().parse(getRequiredString(formData, "id")),
        name: getRequiredString(formData, "name"),
        slug: getRequiredString(formData, "slug"),
        templateKey: categoryTemplateKeySchema.parse(getRequiredString(formData, "templateKey")),
        ...(description ? { description } : {}),
      });
    },
  });
}

export async function createProductAction(formData: FormData) {
  const redirectPath = getOptionalAdminRedirectPath(formData) ?? "/admin/products";
  return runAdminMutation({
    action: "product.create",
    redirectPath,
    successMessage: "Product created.",
    run: async () => {
      await ensurePermission("catalog:write");
      const description = getOptionalString(formData, "description");
      const compareAtPriceCents = getOptionalNumber(formData, "compareAtPriceCents");
      const product = createAdminProduct({
        name: getRequiredString(formData, "name"),
        categoryId: z.string().uuid().parse(getRequiredString(formData, "categoryId")),
        slug: getRequiredString(formData, "slug"),
        ...(description ? { description } : {}),
        baseSku: getRequiredString(formData, "baseSku"),
        priceCents: getRequiredNumber(formData, "priceCents"),
        ...(typeof compareAtPriceCents === "number" ? { compareAtPriceCents } : {}),
        stockOnHand: getRequiredNumber(formData, "stockOnHand"),
        tags: parseTagList(formData, "tags"),
        currency: currencySchema.parse(getRequiredString(formData, "currency")),
        status: productStatusSchema.parse(getRequiredString(formData, "status")),
      });
      await syncInventoryFromRuntimeCatalogForProduct(product.id);
    },
  });
}

export async function updateProductAction(formData: FormData) {
  const redirectPath = getOptionalAdminRedirectPath(formData) ?? "/admin/products";
  return runAdminMutation({
    action: "product.update",
    redirectPath,
    successMessage: "Product updated.",
    run: async () => {
      await ensurePermission("catalog:write");
      const description = getOptionalString(formData, "description");
      const compareAtPriceCents = getOptionalNumber(formData, "compareAtPriceCents");
      const product = updateAdminProduct({
        id: z.string().uuid().parse(getRequiredString(formData, "id")),
        categoryId: z.string().uuid().parse(getRequiredString(formData, "categoryId")),
        name: getRequiredString(formData, "name"),
        slug: getRequiredString(formData, "slug"),
        ...(description ? { description } : {}),
        baseSku: getRequiredString(formData, "baseSku"),
        currency: currencySchema.parse(getRequiredString(formData, "currency")),
        priceCents: getRequiredNumber(formData, "priceCents"),
        ...(typeof compareAtPriceCents === "number" ? { compareAtPriceCents } : {}),
        tags: parseTagList(formData, "tags"),
        status: productStatusSchema.parse(getRequiredString(formData, "status")),
      });
      await syncInventoryFromRuntimeCatalogForProduct(product.id);
    },
  });
}

export async function createVariantAction(formData: FormData) {
  const redirectPath = getOptionalAdminRedirectPath(formData) ?? "/admin/products";
  return runAdminMutation({
    action: "variant.create",
    redirectPath,
    successMessage: "Variant created.",
    run: async () => {
      await ensurePermission("catalog:write");
      const productId = z.string().uuid().parse(getRequiredString(formData, "productId"));
      const attributeValues = parseVariantAttributesFromForm(formData, productId);
      const compareAtPriceCents = getOptionalNumber(formData, "compareAtPriceCents");
      const variant = createAdminVariant({
        productId,
        sku: getRequiredString(formData, "sku"),
        name: getRequiredString(formData, "name"),
        priceCents: getRequiredNumber(formData, "priceCents"),
        ...(typeof compareAtPriceCents === "number" ? { compareAtPriceCents } : {}),
        stockOnHand: getRequiredNumber(formData, "stockOnHand"),
        isDefault: isChecked(formData, "isDefault"),
        attributeValues: attributeValues ?? {},
      });
      await syncInventoryFromRuntimeCatalogForVariant(variant.id);
    },
  });
}

export async function updateVariantAction(formData: FormData) {
  const redirectPath = getOptionalAdminRedirectPath(formData) ?? "/admin/products";
  return runAdminMutation({
    action: "variant.update",
    redirectPath,
    successMessage: "Variant updated.",
    run: async () => {
      await ensurePermission("catalog:write");
      const variantId = z.string().uuid().parse(getRequiredString(formData, "id"));
      const formProductId = z.string().uuid().parse(getRequiredString(formData, "productId"));
      const existingVariant = listAdminVariants().find((v) => v.id === variantId);
      if (!existingVariant || existingVariant.productId !== formProductId) {
        throw createAdminMutationError(
          "validation",
          "Variant does not match the provided product.",
        );
      }
      const attributeValues = parseVariantAttributesFromForm(formData, existingVariant.productId);
      const compareAtPriceCents = getOptionalNumber(formData, "compareAtPriceCents");
      const variant = updateAdminVariant({
        id: variantId,
        sku: getRequiredString(formData, "sku"),
        name: getRequiredString(formData, "name"),
        priceCents: getRequiredNumber(formData, "priceCents"),
        ...(typeof compareAtPriceCents === "number" ? { compareAtPriceCents } : {}),
        stockMode: getStockMode(formData, "stockMode"),
        stockValue: getRequiredNumber(formData, "stockValue"),
        isDefault: isChecked(formData, "isDefault"),
        ...(attributeValues !== undefined ? { attributeValues } : {}),
      });
      await syncInventoryFromRuntimeCatalogForVariant(variant.id);
    },
  });
}

export async function createNewsPostAction(formData: FormData) {
  return runAdminMutation({
    action: "news.create",
    redirectPath: "/admin/content",
    successMessage: "News post created.",
    run: async () => {
      await ensurePermission("content:write");
      createAdminNewsPost({
        title: getRequiredString(formData, "title"),
        summary: getRequiredString(formData, "summary"),
        body: getRequiredString(formData, "body"),
        status: newsStatusSchema.parse(getRequiredString(formData, "status")),
      });
    },
  });
}

export async function setNewsStatusAction(formData: FormData) {
  return runAdminMutation({
    action: "news.status",
    redirectPath: "/admin/content",
    successMessage: "News status updated.",
    run: async () => {
      await ensurePermission("content:write");
      setAdminNewsStatus(
        z.string().uuid().parse(getRequiredString(formData, "newsId")),
        newsStatusSchema.parse(getRequiredString(formData, "status")),
      );
    },
  });
}

export async function createPromoBannerAction(formData: FormData) {
  return runAdminMutation({
    action: "banner.create",
    redirectPath: "/admin/content",
    successMessage: "Promo banner created.",
    run: async () => {
      await ensurePermission("content:write");
      const subtitle = getOptionalString(formData, "subtitle");
      const ctaLabel = getOptionalString(formData, "ctaLabel");
      const ctaHref = getOptionalString(formData, "ctaHref");
      const startsAt = getRequiredString(formData, "startsAt");
      const endsAt = getRequiredString(formData, "endsAt");
      z.string().datetime().parse(startsAt);
      z.string().datetime().parse(endsAt);
      createAdminPromoBanner({
        title: getRequiredString(formData, "title"),
        ...(subtitle ? { subtitle } : {}),
        ...(ctaLabel ? { ctaLabel } : {}),
        ...(ctaHref ? { ctaHref } : {}),
        startsAt,
        endsAt,
        isActive: isChecked(formData, "isActive"),
      });
    },
  });
}

export async function setPromoBannerActiveAction(formData: FormData) {
  return runAdminMutation({
    action: "banner.status",
    redirectPath: "/admin/content",
    successMessage: "Promo banner status updated.",
    run: async () => {
      await ensurePermission("content:write");
      setAdminPromoBannerActive(
        z.string().uuid().parse(getRequiredString(formData, "bannerId")),
        isChecked(formData, "isActive"),
      );
    },
  });
}

export async function createFeaturedSaleAction(formData: FormData) {
  return runAdminMutation({
    action: "featured.create",
    redirectPath: "/admin/content",
    successMessage: "Featured sale created.",
    run: async () => {
      await ensurePermission("content:write");
      const productIdsInput = getRequiredString(formData, "productIds");
      const description = getOptionalString(formData, "description");
      const productIds = productIdsInput
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0);

      const startsAt = getRequiredString(formData, "startsAt");
      const endsAt = getRequiredString(formData, "endsAt");
      z.string().datetime().parse(startsAt);
      z.string().datetime().parse(endsAt);
      z.array(z.string().uuid()).min(1).max(24).parse(productIds);
      createAdminFeaturedSale({
        title: getRequiredString(formData, "title"),
        ...(description ? { description } : {}),
        startsAt,
        endsAt,
        isActive: isChecked(formData, "isActive"),
        productIds,
      });
    },
  });
}

export async function setFeaturedSaleActiveAction(formData: FormData) {
  return runAdminMutation({
    action: "featured.status",
    redirectPath: "/admin/content",
    successMessage: "Featured sale status updated.",
    run: async () => {
      await ensurePermission("content:write");
      setAdminFeaturedSaleActive(
        z.string().uuid().parse(getRequiredString(formData, "featuredSaleId")),
        isChecked(formData, "isActive"),
      );
    },
  });
}

export async function createCouponAction(formData: FormData) {
  return runAdminMutation({
    action: "coupon.create",
    redirectPath: "/admin/coupons",
    successMessage: "Coupon created.",
    run: async () => {
      await ensurePermission("orders:write");
      const percentageOff = getOptionalNumber(formData, "percentageOff");
      const amountOffCents = getOptionalNumber(formData, "amountOffCents");
      const currency = getOptionalString(formData, "currency");
      const usageLimit = getOptionalNumber(formData, "usageLimit");
      const startsAt = getRequiredString(formData, "startsAt");
      const endsAt = getRequiredString(formData, "endsAt");
      z.string().datetime().parse(startsAt);
      z.string().datetime().parse(endsAt);
      if (typeof percentageOff === "number") {
        z.number().int().min(1).max(100).parse(percentageOff);
      }
      if (typeof amountOffCents === "number") {
        z.number().int().positive().parse(amountOffCents);
      }
      if (typeof usageLimit === "number") {
        z.number().int().positive().parse(usageLimit);
      }
      createAdminCoupon({
        code: getRequiredString(formData, "code"),
        type: couponTypeSchema.parse(getRequiredString(formData, "type")),
        ...(typeof percentageOff === "number" ? { percentageOff } : {}),
        ...(typeof amountOffCents === "number" ? { amountOffCents } : {}),
        ...(currency ? { currency: currencySchema.parse(currency) } : {}),
        startsAt,
        endsAt,
        ...(typeof usageLimit === "number" ? { usageLimit } : {}),
        isActive: isChecked(formData, "isActive"),
      });
    },
  });
}

export async function setCouponActiveAction(formData: FormData) {
  return runAdminMutation({
    action: "coupon.status",
    redirectPath: "/admin/coupons",
    successMessage: "Coupon status updated.",
    run: async () => {
      await ensurePermission("orders:write");
      setAdminCouponActive(
        z.string().uuid().parse(getRequiredString(formData, "couponId")),
        isChecked(formData, "isActive"),
      );
    },
  });
}
