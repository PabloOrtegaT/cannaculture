"use server";

import type { Permission } from "@base-ecommerce/domain";
import { revalidatePath } from "next/cache";
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
  updateAdminProduct,
  updateAdminVariant,
} from "@/server/admin/admin-service";
import { getPermissionAccess } from "@/server/admin/role-guard";

function ensurePermission(permission: Permission) {
  const access = getPermissionAccess(permission);
  if (!access.allowed) {
    throw new Error(`Role ${access.role} cannot perform action "${permission}".`);
  }
}

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required field "${key}".`);
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
    throw new Error(`Field "${key}" must be a valid number.`);
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
    throw new Error(`Field "${key}" must be a valid number.`);
  }
  return numeric;
}

function isChecked(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function revalidateAdminAndStorefrontPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/admin/content");
  revalidatePath("/admin/coupons");
  revalidatePath("/admin/import");
  revalidatePath("/");
  revalidatePath("/catalog");
}

export async function createCategoryAction(formData: FormData) {
  ensurePermission("catalog:write");
  const slug = getOptionalString(formData, "slug");
  createAdminCategory({
    name: getRequiredString(formData, "name"),
    ...(slug ? { slug } : {}),
  });
  revalidateAdminAndStorefrontPaths();
}

export async function createProductAction(formData: FormData) {
  ensurePermission("catalog:write");
  createAdminProduct({
    name: getRequiredString(formData, "name"),
    categoryId: getRequiredString(formData, "categoryId"),
    priceCents: getRequiredNumber(formData, "priceCents"),
    stockOnHand: getRequiredNumber(formData, "stockOnHand"),
    currency: getRequiredString(formData, "currency") as "MXN" | "USD",
    status: getRequiredString(formData, "status") as "draft" | "active" | "archived",
  });
  revalidateAdminAndStorefrontPaths();
}

export async function updateProductAction(formData: FormData) {
  ensurePermission("catalog:write");
  updateAdminProduct({
    id: getRequiredString(formData, "id"),
    name: getRequiredString(formData, "name"),
    priceCents: getRequiredNumber(formData, "priceCents"),
    status: getRequiredString(formData, "status") as "draft" | "active" | "archived",
  });
  revalidateAdminAndStorefrontPaths();
}

export async function createVariantAction(formData: FormData) {
  ensurePermission("catalog:write");
  createAdminVariant({
    productId: getRequiredString(formData, "productId"),
    name: getRequiredString(formData, "name"),
    priceCents: getRequiredNumber(formData, "priceCents"),
    stockOnHand: getRequiredNumber(formData, "stockOnHand"),
    isDefault: isChecked(formData, "isDefault"),
  });
  revalidateAdminAndStorefrontPaths();
}

export async function updateVariantAction(formData: FormData) {
  ensurePermission("catalog:write");
  updateAdminVariant({
    id: getRequiredString(formData, "id"),
    name: getRequiredString(formData, "name"),
    priceCents: getRequiredNumber(formData, "priceCents"),
    stockOnHand: getRequiredNumber(formData, "stockOnHand"),
    isDefault: isChecked(formData, "isDefault"),
  });
  revalidateAdminAndStorefrontPaths();
}

export async function createNewsPostAction(formData: FormData) {
  ensurePermission("content:write");
  createAdminNewsPost({
    title: getRequiredString(formData, "title"),
    summary: getRequiredString(formData, "summary"),
    body: getRequiredString(formData, "body"),
    status: getRequiredString(formData, "status") as "draft" | "published" | "archived",
  });
  revalidateAdminAndStorefrontPaths();
}

export async function setNewsStatusAction(formData: FormData) {
  ensurePermission("content:write");
  setAdminNewsStatus(
    getRequiredString(formData, "newsId"),
    getRequiredString(formData, "status") as "draft" | "published" | "archived",
  );
  revalidateAdminAndStorefrontPaths();
}

export async function createPromoBannerAction(formData: FormData) {
  ensurePermission("content:write");
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
  revalidateAdminAndStorefrontPaths();
}

export async function setPromoBannerActiveAction(formData: FormData) {
  ensurePermission("content:write");
  setAdminPromoBannerActive(getRequiredString(formData, "bannerId"), isChecked(formData, "isActive"));
  revalidateAdminAndStorefrontPaths();
}

export async function createFeaturedSaleAction(formData: FormData) {
  ensurePermission("content:write");
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
  revalidateAdminAndStorefrontPaths();
}

export async function setFeaturedSaleActiveAction(formData: FormData) {
  ensurePermission("content:write");
  setAdminFeaturedSaleActive(getRequiredString(formData, "featuredSaleId"), isChecked(formData, "isActive"));
  revalidateAdminAndStorefrontPaths();
}

export async function createCouponAction(formData: FormData) {
  ensurePermission("orders:write");
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
  revalidateAdminAndStorefrontPaths();
}

export async function setCouponActiveAction(formData: FormData) {
  ensurePermission("orders:write");
  setAdminCouponActive(getRequiredString(formData, "couponId"), isChecked(formData, "isActive"));
  revalidateAdminAndStorefrontPaths();
}

export async function importCatalogCsvAction(csvText: string) {
  ensurePermission("catalog:write");
  const result = importAdminCatalogFromCsv(csvText);
  revalidateAdminAndStorefrontPaths();
  return result;
}
