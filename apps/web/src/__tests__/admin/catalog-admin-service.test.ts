import { beforeEach, describe, expect, it } from "vitest";
import {
  createAdminCategory,
  createAdminCoupon,
  createAdminFeaturedSale,
  createAdminNewsPost,
  createAdminProduct,
  createAdminPromoBanner,
  createAdminVariant,
  importAdminCatalogFromCsv,
  listAdminCategories,
  listAdminContentRows,
  listAdminCoupons,
  listAdminDashboardAnalytics,
  listAdminFeaturedSales,
  listAdminNewsPosts,
  listAdminOrders,
  listAdminProducts,
  listAdminPromoBanners,
  listAdminVariants,
  setAdminCouponActive,
  setAdminFeaturedSaleActive,
  setAdminNewsStatus,
  setAdminPromoBannerActive,
  updateAdminCategory,
  updateAdminProduct,
  updateAdminVariant,
} from "@/server/admin/admin-service";
import { resetRuntimeStore } from "@/server/data/runtime-store";

describe("admin catalog service", () => {
  beforeEach(() => {
    resetRuntimeStore();
  });

  it("updates categories and supports expanded product/variant fields", () => {
    const [category] = listAdminCategories();
    expect(category).toBeDefined();
    if (!category) {
      return;
    }

    const updatedCategory = updateAdminCategory({
      id: category.id,
      name: `${category.name} Updated`,
      slug: `${category.slug}-updated`,
      description: "Updated category description",
    });
    expect(updatedCategory.slug).toContain("-updated");

    const createdProduct = createAdminProduct({
      name: "Admin Service Product",
      slug: "admin-service-product",
      description: "Product description",
      categoryId: category.id,
      baseSku: "ADMIN_SERVICE_PRODUCT",
      priceCents: 1000,
      compareAtPriceCents: 1200,
      stockOnHand: 4,
      tags: ["test", "admin"],
      currency: "MXN",
      status: "active",
    });

    const updatedProduct = updateAdminProduct({
      id: createdProduct.id,
      name: "Admin Service Product Updated",
      slug: "admin-service-product-updated",
      description: "Updated description",
      categoryId: category.id,
      baseSku: "ADMIN_SERVICE_PRODUCT_UPDATED",
      priceCents: 1400,
      compareAtPriceCents: 1800,
      tags: ["updated"],
      currency: "USD",
      status: "active",
    });
    expect(updatedProduct.baseSku).toBe("ADMIN_SERVICE_PRODUCT_UPDATED");
    expect(updatedProduct.tags).toEqual(["updated"]);
    expect(updatedProduct.currency).toBe("USD");

    const updatedProductRow = listAdminProducts().find((product) => product.id === createdProduct.id);
    expect(updatedProductRow?.compareAtPriceCents).toBe(1800);

    const createdVariant = createAdminVariant({
      productId: createdProduct.id,
      sku: "ADMIN_SERVICE_VARIANT",
      name: "Bundle",
      priceCents: 1500,
      compareAtPriceCents: 2000,
      stockOnHand: 2,
      isDefault: false,
    });

    const updatedVariant = updateAdminVariant({
      id: createdVariant.id,
      sku: "ADMIN_SERVICE_VARIANT_UPDATED",
      name: "Bundle Updated",
      priceCents: 1600,
      compareAtPriceCents: 2100,
      stockMode: "set",
      stockValue: 1,
      isDefault: false,
    });
    expect(updatedVariant.sku).toBe("ADMIN_SERVICE_VARIANT_UPDATED");
    expect(updatedVariant.compareAtPriceCents).toBe(2100);
    expect(updatedVariant.stockOnHand).toBe(1);

    const adjustedVariant = updateAdminVariant({
      id: createdVariant.id,
      sku: "ADMIN_SERVICE_VARIANT_UPDATED",
      name: "Bundle Updated",
      priceCents: 1600,
      compareAtPriceCents: 2100,
      stockMode: "adjust",
      stockValue: 2,
      isDefault: false,
    });
    expect(adjustedVariant.stockOnHand).toBe(3);
  });

  it("throws not_found for invalid ids and rejects stock underflow", () => {
    expect(() =>
      updateAdminCategory({
        id: "missing",
        name: "Missing",
        slug: "missing",
      }),
    ).toThrow("Category not found.");

    expect(() =>
      updateAdminProduct({
        id: "missing",
        categoryId: "missing",
        name: "Missing",
        slug: "missing",
        baseSku: "missing",
        currency: "MXN",
        priceCents: 100,
        tags: [],
        status: "active",
      }),
    ).toThrow("Product not found.");

    expect(() =>
      updateAdminVariant({
        id: "missing",
        sku: "missing",
        name: "Missing",
        priceCents: 100,
        stockMode: "set",
        stockValue: 1,
        isDefault: false,
      }),
    ).toThrow("Variant not found.");

    const [category] = listAdminCategories();
    if (!category) {
      return;
    }

    const product = createAdminProduct({
      name: "Stock Guard Product",
      categoryId: category.id,
      slug: "stock-guard-product",
      baseSku: "STOCK_GUARD",
      priceCents: 1000,
      stockOnHand: 2,
      tags: [],
      currency: "MXN",
      status: "active",
    });

    const variant = createAdminVariant({
      productId: product.id,
      sku: "STOCK_GUARD_VARIANT",
      name: "Default",
      priceCents: 1000,
      stockOnHand: 2,
      isDefault: false,
    });

    expect(() =>
      updateAdminVariant({
        id: variant.id,
        sku: variant.sku,
        name: variant.name,
        priceCents: variant.priceCents,
        stockMode: "adjust",
        stockValue: -5,
        isDefault: false,
      }),
    ).toThrow("Stock adjustment cannot result in negative inventory.");
  });

  it("creates and toggles content and coupon entities", () => {
    const news = createAdminNewsPost({
      title: "Breaking",
      summary: "Detailed summary for admin content tests.",
      body: "This is a long form body used to satisfy validation requirements for news posts in tests.",
      status: "draft",
    });
    setAdminNewsStatus(news.id, "published");

    const banner = createAdminPromoBanner({
      title: "Promo",
      subtitle: "Sub",
      ctaLabel: "Buy",
      ctaHref: "/catalog",
      startsAt: "2026-03-01T00:00:00.000Z",
      endsAt: "2026-03-15T00:00:00.000Z",
      isActive: false,
    });
    setAdminPromoBannerActive(banner.id, true);

    const [category] = listAdminCategories();
    if (!category) {
      return;
    }
    const product = createAdminProduct({
      name: "Sale Product",
      categoryId: category.id,
      slug: "sale-product",
      baseSku: "SALE_PRODUCT",
      priceCents: 2500,
      stockOnHand: 1,
      tags: [],
      currency: "USD",
      status: "active",
    });

    const featured = createAdminFeaturedSale({
      title: "Weekend Sale",
      startsAt: "2026-03-01T00:00:00.000Z",
      endsAt: "2026-03-07T00:00:00.000Z",
      isActive: false,
      productIds: [product.id],
    });
    setAdminFeaturedSaleActive(featured.id, true);

    const coupon = createAdminCoupon({
      code: "save25",
      type: "percentage",
      percentageOff: 25,
      startsAt: "2026-03-01T00:00:00.000Z",
      endsAt: "2026-03-31T00:00:00.000Z",
      isActive: false,
    });
    const updatedCoupon = setAdminCouponActive(coupon.id, true);

    expect(updatedCoupon.isActive).toBe(true);
    expect(listAdminNewsPosts().length).toBeGreaterThan(0);
    expect(listAdminPromoBanners().length).toBeGreaterThan(0);
    expect(listAdminFeaturedSales().length).toBeGreaterThan(0);
    expect(listAdminCoupons().length).toBeGreaterThan(0);
    expect(listAdminContentRows().length).toBeGreaterThan(0);
  });

  it("returns dashboard analytics datasets", () => {
    const orders = listAdminOrders();
    expect(orders.length).toBeGreaterThan(0);

    const analytics = listAdminDashboardAnalytics();
    expect(Array.isArray(analytics.salesTrend)).toBe(true);
    expect(Array.isArray(analytics.topProducts)).toBe(true);
    expect(Array.isArray(analytics.orderStatus)).toBe(true);
  });

  it("imports csv rows and reports duplicates/unknown category errors", () => {
    createAdminCategory({
      name: "CSV Cat",
      slug: "csv-cat",
    });

    const csv = [
      "name,slug,baseSku,categorySlug,status,currency,priceCents,stockOnHand",
      "CSV Product,csv-product,CSV_SKU,csv-cat,active,MXN,1000,2",
      "CSV Product Duplicate Slug,csv-product,CSV_SKU_2,csv-cat,active,MXN,1000,2",
      "CSV Product Duplicate SKU,csv-product-2,CSV_SKU,csv-cat,active,MXN,1000,2",
      "CSV Product Bad Category,csv-product-3,CSV_SKU_3,missing-category,active,MXN,1000,2",
    ].join("\n");

    const result = importAdminCatalogFromCsv(csv);

    expect(result.importedProducts).toBe(1);
    expect(result.importedVariants).toBe(1);
    expect(result.errors.length).toBe(3);
    expect(listAdminProducts().some((product) => product.slug === "csv-product")).toBe(true);
    expect(listAdminVariants().length).toBeGreaterThan(0);
  });
});
