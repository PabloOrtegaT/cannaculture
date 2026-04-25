import { beforeEach, describe, expect, it, vi } from "vitest";

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockBatch = vi.fn();

const mockDb = {
  insert: mockInsert,
  select: mockSelect,
  update: mockUpdate,
  batch: mockBatch,
};

vi.doMock("@/server/db/client", () => ({
  getDb: vi.fn(() => mockDb),
}));

vi.doMock("@/server/db/schema", () => ({
  couponRedemptionsTable: {
    id: "id",
    couponId: "couponId",
    orderId: "orderId",
    userId: "userId",
    createdAt: "createdAt",
  },
  ordersTable: {
    id: "id",
    userId: "userId",
    orderNumber: "orderNumber",
    status: "status",
    paymentStatus: "paymentStatus",
    currency: "currency",
    subtotalCents: "subtotalCents",
    discountCents: "discountCents",
    shippingCents: "shippingCents",
    totalCents: "totalCents",
    itemCount: "itemCount",
    couponCode: "couponCode",
    couponSnapshot: "couponSnapshot",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  orderItemsTable: {
    id: "id",
    orderId: "orderId",
    productId: "productId",
    variantId: "variantId",
    name: "name",
    variantName: "variantName",
    href: "href",
    currency: "currency",
    unitPriceCents: "unitPriceCents",
    quantity: "quantity",
    lineTotalCents: "lineTotalCents",
    unavailableReason: "unavailableReason",
    createdAt: "createdAt",
  },
  orderStatusTimelineTable: {
    id: "id",
    orderId: "orderId",
    status: "status",
    actorType: "actorType",
    actorId: "actorId",
    note: "note",
    createdAt: "createdAt",
  },
  inventoryHoldsTable: {
    id: "id",
    orderId: "orderId",
    variantId: "variantId",
    quantity: "quantity",
    expiresAt: "expiresAt",
    createdAt: "createdAt",
  },
  inventoryStocksTable: {
    variantId: "variantId",
    onHandQty: "onHandQty",
    availableQty: "availableQty",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  paymentAttemptsTable: {
    id: "id",
    orderId: "orderId",
    provider: "provider",
    providerSessionId: "providerSessionId",
    status: "status",
    checkoutUrl: "checkoutUrl",
    amountCents: "amountCents",
    currency: "currency",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
}));

import type { Coupon } from "@cannaculture/domain";

describe("coupon redemption tracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("assertCouponRedemptionAllowed", () => {
    it("allows first redemption when no limits are set", async () => {
      const { assertCouponRedemptionAllowed } = await import(
        "@/server/payments/checkout-service"
      );

      mockSelect.mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
        })),
      });

      const coupon = { id: "coupon-1" } as unknown as Coupon;
      await expect(
        assertCouponRedemptionAllowed(coupon, "user-1", "order-1"),
      ).resolves.toBeUndefined();
    });

    it("allows first redemption when under global limit", async () => {
      const { assertCouponRedemptionAllowed } = await import(
        "@/server/payments/checkout-service"
      );

      mockSelect
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve([{ count: 5 }])),
          })),
        });

      const coupon = { id: "coupon-1", usageLimit: 10 } as unknown as Coupon;
      await expect(
        assertCouponRedemptionAllowed(coupon, "user-1", "order-1"),
      ).resolves.toBeUndefined();
    });

    it("rejects duplicate order redemption", async () => {
      const { assertCouponRedemptionAllowed } = await import(
        "@/server/payments/checkout-service"
      );

      mockSelect.mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([{ id: "redemption-1" }])),
          })),
        })),
      });

      const coupon = { id: "coupon-1" } as unknown as Coupon;
      await expect(
        assertCouponRedemptionAllowed(coupon, "user-1", "order-1"),
      ).rejects.toThrow("already been applied to this order");
    });

    it("rejects when global limit is exceeded", async () => {
      const { assertCouponRedemptionAllowed } = await import(
        "@/server/payments/checkout-service"
      );

      mockSelect
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve([{ count: 100 }])),
          })),
        });

      const coupon = { id: "coupon-1", usageLimit: 100 } as unknown as Coupon;
      await expect(
        assertCouponRedemptionAllowed(coupon, "user-1", "order-1"),
      ).rejects.toThrow("reached its maximum number of uses");
    });

    it("rejects when per-user limit is exceeded", async () => {
      const { assertCouponRedemptionAllowed } = await import(
        "@/server/payments/checkout-service"
      );

      mockSelect
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve([{ count: 0 }])),
          })),
        })
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve([{ count: 3 }])),
          })),
        });

      const coupon = { id: "coupon-1", usageLimit: 100, perUserLimit: 3 } as unknown as Coupon;
      await expect(
        assertCouponRedemptionAllowed(coupon, "user-1", "order-1"),
      ).rejects.toThrow("already used this coupon the maximum number of times");
    });
  });

  describe("createPendingCheckoutOrder", () => {
    it("includes coupon redemption in the batch when provided", async () => {
      const { createPendingCheckoutOrder } = await import("@/server/orders/service");

      const batchResult = [[{ id: "order-1" }], undefined, undefined, undefined];
      mockBatch.mockResolvedValue(batchResult);

      mockInsert.mockReturnValue({
        values: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve()),
        })),
      });

      const cart = {
        items: [
          {
            productId: "prod-1",
            variantId: "var-1",
            name: "Test Product",
            variantName: "Default",
            href: "/test",
            currency: "MXN",
            unitPriceCents: 10000,
            quantity: 1,
            unavailableReason: null,
          },
        ],
      };

      await createPendingCheckoutOrder({
        id: "order-1",
        userId: "user-1",
        cart: cart as unknown as import("@/features/cart/cart").CartState,
        totals: {
          subtotalCents: 10000,
          discountCents: 1000,
          shippingCents: 0,
          totalCents: 9000,
          itemCount: 1,
          currency: "MXN",
        },
        couponCode: "PLANT10",
        couponSnapshot: {
          id: "coupon-1",
          code: "PLANT10",
          type: "percentage",
          target: "subtotal",
          percentageOff: 10,
        },
        couponRedemption: { couponId: "coupon-1", orderId: "order-1", userId: "user-1" },
      });

      expect(mockBatch).toHaveBeenCalledTimes(1);
      const batchStatements = mockBatch.mock.calls[0]![0] as unknown[];
      // Should have 4 statements: order, items, timeline, redemption
      expect(batchStatements.length).toBe(4);
    });

    it("does not include redemption statement when couponRedemption is omitted", async () => {
      const { createPendingCheckoutOrder } = await import("@/server/orders/service");

      const batchResult = [[{ id: "order-1" }], undefined, undefined];
      mockBatch.mockResolvedValue(batchResult);

      mockInsert.mockReturnValue({
        values: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve()),
        })),
      });

      const cart = {
        items: [
          {
            productId: "prod-1",
            variantId: "var-1",
            name: "Test Product",
            variantName: "Default",
            href: "/test",
            currency: "MXN",
            unitPriceCents: 10000,
            quantity: 1,
            unavailableReason: null,
          },
        ],
      };

      await createPendingCheckoutOrder({
        id: "order-1",
        userId: "user-1",
        cart: cart as unknown as import("@/features/cart/cart").CartState,
        totals: {
          subtotalCents: 10000,
          discountCents: 0,
          shippingCents: 0,
          totalCents: 10000,
          itemCount: 1,
          currency: "MXN",
        },
      });

      expect(mockBatch).toHaveBeenCalledTimes(1);
      const batchStatements = mockBatch.mock.calls[0]![0] as unknown[];
      // Should have 3 statements: order, items, timeline
      expect(batchStatements.length).toBe(3);
    });
  });
});
