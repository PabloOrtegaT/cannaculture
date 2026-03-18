import { beforeEach, describe, expect, it, vi } from "vitest";
import { cartItemsTable, cartsTable } from "@/server/db/schema";

const { getActiveStoreProfileMock, getProfileRuntimeStoreMock, mergeCartStatesMock, getDbMock } = vi.hoisted(() => ({
  getActiveStoreProfileMock: vi.fn(() => "pc-components"),
  getProfileRuntimeStoreMock: vi.fn(),
  mergeCartStatesMock: vi.fn(),
  getDbMock: vi.fn(),
}));

vi.mock("@/server/config/store-profile", () => ({
  getActiveStoreProfile: getActiveStoreProfileMock,
}));

vi.mock("@/server/data/runtime-store", () => ({
  getProfileRuntimeStore: getProfileRuntimeStoreMock,
}));

vi.mock("@/server/cart/merge", () => ({
  mergeCartStates: mergeCartStatesMock,
}));

vi.mock("@/server/db/client", () => ({
  getDb: getDbMock,
}));

import {
  getUserCart,
  replaceUserCart,
  resolveVariantFromActiveCatalog,
  reconcileCartState,
  getVariantAvailability,
  mergeGuestCartIntoUserCart,
  getActiveUserCount,
} from "@/server/cart/service";

type CartRow = {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

type CartItemRow = {
  cartId: string;
  variantId: string;
  productId: string;
  name: string;
  variantName: string;
  href: string;
  currency: "MXN" | "USD";
  unitPriceCents: number;
  stockOnHand: number;
  quantity: number;
  unavailableReason: string | null;
  updatedAt: Date;
};

function createDbStub(state: {
  carts: CartRow[];
  items: CartItemRow[];
  activeUsersCount?: number;
}) {
  return {
    select: vi.fn(() => ({
      from: vi.fn((table: unknown) => {
        if (table === cartsTable) {
          return {
            where: vi.fn(() => ({
              limit: vi.fn(async () => state.carts.slice(0, 1)),
            })),
            limit: vi.fn(async () => [{ count: state.activeUsersCount ?? state.carts.length }]),
          };
        }

        if (table === cartItemsTable) {
          return {
            where: vi.fn(async () => state.items),
          };
        }

        return {
          where: vi.fn(async () => []),
          limit: vi.fn(async () => []),
        };
      }),
    })),
    insert: vi.fn((table: unknown) => ({
      values: vi.fn((value: Record<string, unknown>) => {
        if (table === cartsTable) {
          const created: CartRow = {
            id: String(value.id),
            userId: String(value.userId),
            createdAt: value.createdAt as Date,
            updatedAt: value.updatedAt as Date,
          };
          state.carts.push(created);
          return {
            returning: vi.fn(async () => [created]),
          };
        }

        if (table === cartItemsTable) {
          state.items.push({
            cartId: String(value.cartId),
            variantId: String(value.variantId),
            productId: String(value.productId),
            name: String(value.name),
            variantName: String(value.variantName),
            href: String(value.href),
            currency: value.currency as "MXN" | "USD",
            unitPriceCents: Number(value.unitPriceCents),
            stockOnHand: Number(value.stockOnHand),
            quantity: Number(value.quantity),
            unavailableReason: (value.unavailableReason as string | null | undefined) ?? null,
            updatedAt: value.updatedAt as Date,
          });
          return {
            onConflictDoUpdate: vi.fn(async () => undefined),
          };
        }

        return {
          returning: vi.fn(async () => []),
          onConflictDoUpdate: vi.fn(async () => undefined),
        };
      }),
    })),
    delete: vi.fn((table: unknown) => ({
      where: vi.fn(async () => {
        if (table === cartItemsTable) {
          state.items = [];
        }
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(async () => undefined),
      })),
    })),
  };
}

describe("server cart service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProfileRuntimeStoreMock.mockReturnValue({
      categories: [{ id: "cat-1", slug: "pc-components", name: "PC Components" }],
      products: [
        {
          id: "prod-1",
          categoryId: "cat-1",
          name: "GPU",
          slug: "gpu",
          status: "active",
          currency: "USD",
        },
      ],
      variants: [
        {
          id: "var-1",
          productId: "prod-1",
          name: "Default",
          priceCents: 1000,
          stockOnHand: 3,
        },
      ],
    });
    mergeCartStatesMock.mockResolvedValue({
      cart: { items: [{ variantId: "var-1", quantity: 1 }] },
      summary: { mergedLines: [], adjustedLines: [], unavailableLines: [], messages: [] },
    });
  });

  it("reads user cart lines from persistence", async () => {
    const db = createDbStub({
      carts: [{ id: "cart-1", userId: "user-1", createdAt: new Date(), updatedAt: new Date() }],
      items: [
        {
          cartId: "cart-1",
          variantId: "var-1",
          productId: "prod-1",
          name: "GPU",
          variantName: "Default",
          href: "/catalog/pc-components/gpu",
          currency: "USD",
          unitPriceCents: 1000,
          stockOnHand: 3,
          quantity: 2,
          unavailableReason: null,
          updatedAt: new Date(),
        },
      ],
    });
    getDbMock.mockReturnValue(db);

    const cart = await getUserCart("user-1");

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]?.variantId).toBe("var-1");
    expect(cart.items[0]?.currency).toBe("USD");
  });

  it("creates missing cart and replaces items", async () => {
    const dbState = { carts: [] as CartRow[], items: [] as CartItemRow[] };
    const db = createDbStub(dbState);
    getDbMock.mockReturnValue(db);

    await replaceUserCart("user-2", {
      items: [
        {
          productId: "prod-1",
          variantId: "var-1",
          name: "GPU",
          variantName: "Default",
          href: "/catalog/pc-components/gpu",
          currency: "USD",
          unitPriceCents: 1000,
          stockOnHand: 3,
          quantity: 1,
        },
      ],
    });

    expect(dbState.carts.length).toBe(1);
    expect(dbState.items.length).toBe(1);
    expect(dbState.items[0]?.variantId).toBe("var-1");
  });

  it("resolves available and unavailable variants from active catalog", () => {
    const available = resolveVariantFromActiveCatalog("var-1");
    expect(available.status).toBe("available");

    const missing = resolveVariantFromActiveCatalog("missing");
    expect(missing.status).toBe("unavailable");
    if (missing.status === "unavailable") {
      expect(missing.reason).toBe("Variant not found.");
    }
  });

  it("reconciles cart state and reads variant availability", async () => {
    const result = await reconcileCartState({
      items: [
        {
          productId: "prod-1",
          variantId: "var-1",
          name: "GPU",
          variantName: "Default",
          href: "/catalog/pc-components/gpu",
          currency: "USD",
          unitPriceCents: 1000,
          stockOnHand: 3,
          quantity: 1,
        },
      ],
    });
    expect(result.cart.items).toHaveLength(1);

    const availability = getVariantAvailability("var-1");
    expect(availability).toEqual({
      variantId: "var-1",
      stockOnHand: 3,
      isPurchasable: true,
    });

    const unavailable = getVariantAvailability("missing");
    expect(unavailable.isPurchasable).toBe(false);
  });

  it("merges guest cart into server cart and returns active user count", async () => {
    const db = createDbStub({
      carts: [{ id: "cart-1", userId: "user-1", createdAt: new Date(), updatedAt: new Date() }],
      items: [],
      activeUsersCount: 9,
    });
    getDbMock.mockReturnValue(db);

    const mergeResult = await mergeGuestCartIntoUserCart("user-1", { items: [] });
    expect(mergeResult.cart.items[0]?.variantId).toBe("var-1");
    expect(mergeCartStatesMock).toHaveBeenCalled();

    const activeUsers = await getActiveUserCount();
    expect(activeUsers).toBe(9);
  });
});
