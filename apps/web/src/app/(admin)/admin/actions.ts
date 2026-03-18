"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createAdminCategory,
  createAdminCoupon,
  createAdminFeaturedSale,
  createAdminNewsPost,
  createAdminProduct,
  createAdminPromoBanner,
  createAdminVariant,
  importAdminCatalogFromCsv,
  setAdminCouponActive,
  setAdminFeaturedSaleActive,
  setAdminNewsStatus,
  setAdminPromoBannerActive,
  updateAdminCategory,
  updateAdminProduct,
  updateAdminVariant,
} from "@/server/admin/admin-service";
import { createAdminMutationError, mapAdminMutationError } from "@/server/admin/mutation-errors";
import { ensurePermission } from "@/server/admin/role-guard";
import type { AdminVariantStockMode } from "@/server/admin/stock-mode";
import { setFlashToast } from "@/server/feedback/flash-toast";

type MutationConfig = {
  successMessage: string;
  redirectPath: string;
  run: () => void | Promise<void>;
};

async function runAdminMutation(config: MutationConfig) {
  try {
    await config.run();
    revalidateAdminAndStorefrontPaths();
    await setFlashToast({
      type: "success",
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

function revalidateAdminAndStorefrontPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  revalidatePath("/admin/content");
  revalidatePath("/admin/coupons");
  revalidatePath("/admin/import");
  revalidatePath("/");
  revalidatePath("/catalog");
}

export async function createCategoryAction(formData: FormData) {
  return runAdminMutation({
    redirectPath: "/admin/categories",
    successMessage: "Category created.",
    run: async () => {
      await ensurePermission("catalog:write");
      const slug = getOptionalString(formData, "slug");
      const description = getOptionalString(formData, "description");
      createAdminCategory({
        name: getRequiredString(formData, "name"),
        ...(slug ? { slug } : {}),
        ...(description ? { description } : {}),
      });
    },
  });
}

export async function updateCategoryAction(formData: FormData) {
  return runAdminMutation({
    redirectPath: "/admin/categories",
    successMessage: "Category updated.",
    run: async () => {
      await ensurePermission("catalog:write");
      const description = getOptionalString(formData, "description");
      updateAdminCategory({
        id: getRequiredString(formData, "id"),
        name: getRequiredString(formData, "name"),
        slug: getRequiredString(formData, "slug"),
        ...(description ? { description } : {}),
      });
    },
  });
}

export async function createProductAction(formData: FormData) {
  return runAdminMutation({
    redirectPath: "/admin/products",
    successMessage: "Product created.",
    run: async () => {
      await ensurePermission("catalog:write");
      const description = getOptionalString(formData, "description");
      const compareAtPriceCents = getOptionalNumber(formData, "compareAtPriceCents");
      createAdminProduct({
        name: getRequiredString(formData, "name"),
        categoryId: getRequiredString(formData, "categoryId"),
        slug: getRequiredString(formData, "slug"),
        ...(description ? { description } : {}),
        baseSku: getRequiredString(formData, "baseSku"),
        priceCents: getRequiredNumber(formData, "priceCents"),
        ...(typeof compareAtPriceCents === "number" ? { compareAtPriceCents } : {}),
        stockOnHand: getRequiredNumber(formData, "stockOnHand"),
        tags: parseTagList(formData, "tags"),
        currency: getRequiredString(formData, "currency") as "MXN" | "USD",
        status: getRequiredString(formData, "status") as "draft" | "active" | "archived",
      });
    },
  });
}

export async function updateProductAction(formData: FormData) {
  return runAdminMutation({
    redirectPath: "/admin/products",
    successMessage: "Product updated.",
    run: async () => {
      await ensurePermission("catalog:write");
      const description = getOptionalString(formData, "description");
      const compareAtPriceCents = getOptionalNumber(formData, "compareAtPriceCents");
      updateAdminProduct({
        id: getRequiredString(formData, "id"),
        categoryId: getRequiredString(formData, "categoryId"),
        name: getRequiredString(formData, "name"),
        slug: getRequiredString(formData, "slug"),
        ...(description ? { description } : {}),
        baseSku: getRequiredString(formData, "baseSku"),
        currency: getRequiredString(formData, "currency") as "MXN" | "USD",
        priceCents: getRequiredNumber(formData, "priceCents"),
        ...(typeof compareAtPriceCents === "number" ? { compareAtPriceCents } : {}),
        tags: parseTagList(formData, "tags"),
        status: getRequiredString(formData, "status") as "draft" | "active" | "archived",
      });
    },
  });
}

export async function createVariantAction(formData: FormData) {
  return runAdminMutation({
    redirectPath: "/admin/products",
    successMessage: "Variant created.",
    run: async () => {
      await ensurePermission("catalog:write");
      const compareAtPriceCents = getOptionalNumber(formData, "compareAtPriceCents");
      createAdminVariant({
        productId: getRequiredString(formData, "productId"),
        sku: getRequiredString(formData, "sku"),
        name: getRequiredString(formData, "name"),
        priceCents: getRequiredNumber(formData, "priceCents"),
        ...(typeof compareAtPriceCents === "number" ? { compareAtPriceCents } : {}),
        stockOnHand: getRequiredNumber(formData, "stockOnHand"),
        isDefault: isChecked(formData, "isDefault"),
      });
    },
  });
}

export async function updateVariantAction(formData: FormData) {
  return runAdminMutation({
    redirectPath: "/admin/products",
    successMessage: "Variant updated.",
    run: async () => {
      await ensurePermission("catalog:write");
      const compareAtPriceCents = getOptionalNumber(formData, "compareAtPriceCents");
      updateAdminVariant({
        id: getRequiredString(formData, "id"),
        sku: getRequiredString(formData, "sku"),
        name: getRequiredString(formData, "name"),
        priceCents: getRequiredNumber(formData, "priceCents"),
        ...(typeof compareAtPriceCents === "number" ? { compareAtPriceCents } : {}),
        stockMode: getStockMode(formData, "stockMode"),
        stockValue: getRequiredNumber(formData, "stockValue"),
        isDefault: isChecked(formData, "isDefault"),
      });
    },
  });
}

export async function createNewsPostAction(formData: FormData) {
  return runAdminMutation({
    redirectPath: "/admin/content",
    successMessage: "News post created.",
    run: async () => {
      await ensurePermission("content:write");
      createAdminNewsPost({
        title: getRequiredString(formData, "title"),
        summary: getRequiredString(formData, "summary"),
        body: getRequiredString(formData, "body"),
        status: getRequiredString(formData, "status") as "draft" | "published" | "archived",
      });
    },
  });
}

export async function setNewsStatusAction(formData: FormData) {
  return runAdminMutation({
    redirectPath: "/admin/content",
    successMessage: "News status updated.",
    run: async () => {
      await ensurePermission("content:write");
      setAdminNewsStatus(
        getRequiredString(formData, "newsId"),
        getRequiredString(formData, "status") as "draft" | "published" | "archived",
      );
    },
  });
}

export async function createPromoBannerAction(formData: FormData) {
  return runAdminMutation({
    redirectPath: "/admin/content",
    successMessage: "Promo banner created.",
    run: async () => {
      await ensurePermission("content:write");
      const subtitle = getOptionalString(formData, "subtitle");
      const ctaLabel = getOptionalString(formData, "ctaLabel");
      const ctaHref = getOptionalString(formData, "ctaHref");
      createAdminPromoBanner({
        title: getRequiredString(formData, "title"),
        ...(subtitle ? { subtitle } : {}),
        ...(ctaLabel ? { ctaLabel } : {}),
        ...(ctaHref ? { ctaHref } : {}),
        startsAt: getRequiredString(formData, "startsAt"),
        endsAt: getRequiredString(formData, "endsAt"),
        isActive: isChecked(formData, "isActive"),
      });
    },
  });
}

export async function setPromoBannerActiveAction(formData: FormData) {
  return runAdminMutation({
    redirectPath: "/admin/content",
    successMessage: "Promo banner status updated.",
    run: async () => {
      await ensurePermission("content:write");
      setAdminPromoBannerActive(getRequiredString(formData, "bannerId"), isChecked(formData, "isActive"));
    },
  });
}

export async function createFeaturedSaleAction(formData: FormData) {
  return runAdminMutation({
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

      createAdminFeaturedSale({
        title: getRequiredString(formData, "title"),
        ...(description ? { description } : {}),
        startsAt: getRequiredString(formData, "startsAt"),
        endsAt: getRequiredString(formData, "endsAt"),
        isActive: isChecked(formData, "isActive"),
        productIds,
      });
    },
  });
}

export async function setFeaturedSaleActiveAction(formData: FormData) {
  return runAdminMutation({
    redirectPath: "/admin/content",
    successMessage: "Featured sale status updated.",
    run: async () => {
      await ensurePermission("content:write");
      setAdminFeaturedSaleActive(getRequiredString(formData, "featuredSaleId"), isChecked(formData, "isActive"));
    },
  });
}

export async function createCouponAction(formData: FormData) {
  return runAdminMutation({
    redirectPath: "/admin/coupons",
    successMessage: "Coupon created.",
    run: async () => {
      await ensurePermission("orders:write");
      const percentageOff = getOptionalNumber(formData, "percentageOff");
      const amountOffCents = getOptionalNumber(formData, "amountOffCents");
      const currency = getOptionalString(formData, "currency");
      const usageLimit = getOptionalNumber(formData, "usageLimit");
      createAdminCoupon({
        code: getRequiredString(formData, "code"),
        type: getRequiredString(formData, "type") as "percentage" | "fixed",
        ...(typeof percentageOff === "number" ? { percentageOff } : {}),
        ...(typeof amountOffCents === "number" ? { amountOffCents } : {}),
        ...(currency ? { currency: currency as "MXN" | "USD" } : {}),
        startsAt: getRequiredString(formData, "startsAt"),
        endsAt: getRequiredString(formData, "endsAt"),
        ...(typeof usageLimit === "number" ? { usageLimit } : {}),
        isActive: isChecked(formData, "isActive"),
      });
    },
  });
}

export async function setCouponActiveAction(formData: FormData) {
  return runAdminMutation({
    redirectPath: "/admin/coupons",
    successMessage: "Coupon status updated.",
    run: async () => {
      await ensurePermission("orders:write");
      setAdminCouponActive(getRequiredString(formData, "couponId"), isChecked(formData, "isActive"));
    },
  });
}

export async function importCatalogCsvAction(csvText: string) {
  try {
    await ensurePermission("catalog:write");
    const result = importAdminCatalogFromCsv(csvText);
    revalidateAdminAndStorefrontPaths();
    return result;
  } catch (error) {
    const feedback = mapAdminMutationError(error);
    throw new Error(feedback.message);
  }
}
