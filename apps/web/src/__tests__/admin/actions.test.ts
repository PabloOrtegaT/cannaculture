import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  revalidatePathMock,
  redirectMock,
  ensurePermissionMock,
  setFlashToastMock,
  mapAdminMutationErrorMock,
  adminServiceMocks,
} = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
  redirectMock: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  ensurePermissionMock: vi.fn(),
  setFlashToastMock: vi.fn(),
  mapAdminMutationErrorMock: vi.fn(() => ({
    type: "error" as const,
    code: "unknown",
    message: "Could not complete this action. Please try again.",
  })),
  adminServiceMocks: {
    createAdminCategory: vi.fn(),
    updateAdminCategory: vi.fn(),
    createAdminProduct: vi.fn(),
    updateAdminProduct: vi.fn(),
    createAdminVariant: vi.fn(),
    updateAdminVariant: vi.fn(),
    createAdminNewsPost: vi.fn(),
    setAdminNewsStatus: vi.fn(),
    createAdminPromoBanner: vi.fn(),
    setAdminPromoBannerActive: vi.fn(),
    createAdminFeaturedSale: vi.fn(),
    setAdminFeaturedSaleActive: vi.fn(),
    createAdminCoupon: vi.fn(),
    setAdminCouponActive: vi.fn(),
    importAdminCatalogFromCsv: vi.fn(),
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/server/admin/admin-service", () => adminServiceMocks);

vi.mock("@/server/admin/role-guard", () => ({
  ensurePermission: ensurePermissionMock,
}));

vi.mock("@/server/feedback/flash-toast", () => ({
  setFlashToast: setFlashToastMock,
}));

vi.mock("@/server/admin/mutation-errors", async () => {
  const actual = await vi.importActual<typeof import("@/server/admin/mutation-errors")>(
    "@/server/admin/mutation-errors",
  );
  return {
    ...actual,
    mapAdminMutationError: mapAdminMutationErrorMock,
  };
});

import {
  createCategoryAction,
  updateCategoryAction,
  createProductAction,
  updateProductAction,
  createVariantAction,
  updateVariantAction,
  createNewsPostAction,
  setNewsStatusAction,
  createPromoBannerAction,
  setPromoBannerActiveAction,
  createFeaturedSaleAction,
  setFeaturedSaleActiveAction,
  createCouponAction,
  setCouponActiveAction,
  importCatalogCsvAction,
} from "@/app/(admin)/admin/actions";

function expectRedirect(error: unknown, path: string) {
  expect(error).toBeInstanceOf(Error);
  expect((error as Error).message).toBe(`REDIRECT:${path}`);
}

function createFormData(values: Record<string, string | boolean | number>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "boolean") {
      if (value) {
        formData.set(key, "on");
      }
      continue;
    }
    formData.set(key, String(value));
  }
  return formData;
}

describe("admin actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ensurePermissionMock.mockResolvedValue("owner");
    setFlashToastMock.mockResolvedValue(undefined);
    mapAdminMutationErrorMock.mockReturnValue({
      type: "error",
      code: "validation",
      message: "Validation failed.",
    });
    adminServiceMocks.importAdminCatalogFromCsv.mockReturnValue({
      importedProducts: 1,
      importedVariants: 1,
      errors: [],
    });
  });

  it("creates category and redirects with success toast", async () => {
    const formData = createFormData({
      name: "CPUs",
      slug: "cpus",
      description: "Processors",
    });

    try {
      await createCategoryAction(formData);
    } catch (error) {
      expectRedirect(error, "/admin/categories");
    }

    expect(ensurePermissionMock).toHaveBeenCalledWith("catalog:write");
    expect(adminServiceMocks.createAdminCategory).toHaveBeenCalledWith({
      name: "CPUs",
      slug: "cpus",
      description: "Processors",
    });
    expect(setFlashToastMock).toHaveBeenCalledWith({
      type: "success",
      code: "success",
      message: "Category created.",
    });
    expect(revalidatePathMock).toHaveBeenCalled();
  });

  it("handles validation failure with safe error toast", async () => {
    const formData = createFormData({
      slug: "missing-name",
    });

    try {
      await createCategoryAction(formData);
    } catch (error) {
      expectRedirect(error, "/admin/categories");
    }

    expect(adminServiceMocks.createAdminCategory).not.toHaveBeenCalled();
    expect(setFlashToastMock).toHaveBeenCalledWith({
      type: "error",
      code: "validation",
      message: "Validation failed.",
    });
  });

  it("executes category/product/variant/content/coupon status actions", async () => {
    const scenarios: Array<{
      run: () => Promise<unknown>;
      redirectPath: string;
    }> = [
      {
        run: () =>
          updateCategoryAction(
            createFormData({ id: "cat-1", name: "Updated", slug: "updated", description: "desc" }),
          ),
        redirectPath: "/admin/categories",
      },
      {
        run: () =>
          createProductAction(
            createFormData({
              name: "GPU",
              categoryId: "cat-1",
              slug: "gpu",
              description: "desc",
              baseSku: "gpu_sku",
              priceCents: 1000,
              compareAtPriceCents: 1200,
              stockOnHand: 3,
              tags: "pc,gaming",
              currency: "USD",
              status: "active",
            }),
          ),
        redirectPath: "/admin/products",
      },
      {
        run: () =>
          updateProductAction(
            createFormData({
              id: "prod-1",
              name: "GPU Updated",
              categoryId: "cat-1",
              slug: "gpu-updated",
              description: "desc",
              baseSku: "gpu_sku2",
              priceCents: 1000,
              compareAtPriceCents: 1400,
              tags: "pc",
              currency: "USD",
              status: "active",
            }),
          ),
        redirectPath: "/admin/products",
      },
      {
        run: () =>
          createVariantAction(
            createFormData({
              productId: "prod-1",
              sku: "gpu_var",
              name: "Default",
              priceCents: 1000,
              compareAtPriceCents: 1200,
              stockOnHand: 10,
              isDefault: true,
            }),
          ),
        redirectPath: "/admin/products",
      },
      {
        run: () =>
          updateVariantAction(
            createFormData({
              id: "var-1",
              sku: "gpu_var2",
              name: "Updated",
              priceCents: 1000,
              compareAtPriceCents: 1200,
              stockMode: "adjust",
              stockValue: 2,
              isDefault: true,
            }),
          ),
        redirectPath: "/admin/products",
      },
      {
        run: () =>
          createNewsPostAction(
            createFormData({
              title: "News",
              summary: "Summary",
              body: "Body",
              status: "draft",
            }),
          ),
        redirectPath: "/admin/content",
      },
      {
        run: () =>
          setNewsStatusAction(
            createFormData({
              newsId: "news-1",
              status: "published",
            }),
          ),
        redirectPath: "/admin/content",
      },
      {
        run: () =>
          createPromoBannerAction(
            createFormData({
              title: "Banner",
              subtitle: "subtitle",
              ctaLabel: "Buy",
              ctaHref: "/catalog",
              startsAt: "2026-03-01T00:00:00.000Z",
              endsAt: "2026-04-01T00:00:00.000Z",
              isActive: true,
            }),
          ),
        redirectPath: "/admin/content",
      },
      {
        run: () =>
          setPromoBannerActiveAction(
            createFormData({
              bannerId: "banner-1",
              isActive: true,
            }),
          ),
        redirectPath: "/admin/content",
      },
      {
        run: () =>
          createFeaturedSaleAction(
            createFormData({
              title: "Sale",
              description: "desc",
              startsAt: "2026-03-01T00:00:00.000Z",
              endsAt: "2026-04-01T00:00:00.000Z",
              isActive: true,
              productIds: "prod-1,prod-2",
            }),
          ),
        redirectPath: "/admin/content",
      },
      {
        run: () =>
          setFeaturedSaleActiveAction(
            createFormData({
              featuredSaleId: "sale-1",
              isActive: true,
            }),
          ),
        redirectPath: "/admin/content",
      },
      {
        run: () =>
          createCouponAction(
            createFormData({
              code: "SAVE10",
              type: "percentage",
              percentageOff: 10,
              startsAt: "2026-03-01T00:00:00.000Z",
              endsAt: "2026-04-01T00:00:00.000Z",
              usageLimit: 100,
              isActive: true,
            }),
          ),
        redirectPath: "/admin/coupons",
      },
      {
        run: () =>
          setCouponActiveAction(
            createFormData({
              couponId: "coupon-1",
              isActive: true,
            }),
          ),
        redirectPath: "/admin/coupons",
      },
    ];

    for (const scenario of scenarios) {
      try {
        await scenario.run();
      } catch (error) {
        expectRedirect(error, scenario.redirectPath);
      }
    }

    expect(adminServiceMocks.updateAdminVariant).toHaveBeenCalledWith(
      expect.objectContaining({
        stockMode: "adjust",
        stockValue: 2,
      }),
    );
    expect(adminServiceMocks.createAdminCoupon).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "SAVE10",
        type: "percentage",
      }),
    );
  });

  it("maps action failures to safe toast output", async () => {
    ensurePermissionMock.mockRejectedValue(new Error("boom"));

    try {
      await setCouponActiveAction(createFormData({ couponId: "coupon-1", isActive: true }));
    } catch (error) {
      expectRedirect(error, "/admin/coupons");
    }

    expect(mapAdminMutationErrorMock).toHaveBeenCalled();
    expect(setFlashToastMock).toHaveBeenCalledWith({
      type: "error",
      code: "validation",
      message: "Validation failed.",
    });
  });

  it("returns csv import result and rethrows sanitized errors", async () => {
    const result = await importCatalogCsvAction("name,slug\nTest,test");
    expect(result).toEqual({
      importedProducts: 1,
      importedVariants: 1,
      errors: [],
    });

    adminServiceMocks.importAdminCatalogFromCsv.mockImplementationOnce(() => {
      throw new Error("csv_error");
    });
    mapAdminMutationErrorMock.mockReturnValueOnce({
      type: "error",
      code: "validation",
      message: "CSV invalid.",
    });

    await expect(importCatalogCsvAction("bad,csv")).rejects.toThrow("CSV invalid.");
  });
});
