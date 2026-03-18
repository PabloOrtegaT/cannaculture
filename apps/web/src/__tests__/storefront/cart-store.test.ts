import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyCartState } from "@/features/cart/cart";
import { emptyCartMergeSummary } from "@/features/cart/merge-summary";
import { useCartStore } from "@/features/cart/cart-store";

const sampleItem = {
  productId: "p1",
  variantId: "v1",
  name: "Product One",
  variantName: "Default",
  href: "/catalog/category/product-one",
  currency: "MXN",
  unitPriceCents: 2000,
  stockOnHand: 10,
} as const;

describe("zustand cart store", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      }),
    );
    useCartStore.getState().hydrateCart(emptyCartState);
    useCartStore.setState({
      mergeSummary: emptyCartMergeSummary,
      lastSyncSummary: emptyCartMergeSummary,
    });
  });

  it("adds item and persists cart", () => {
    useCartStore.getState().addItem(sampleItem, 1);

    expect(useCartStore.getState().cart.items[0]?.variantId).toBe("v1");
    expect(window.localStorage.getItem("base-ecommerce-cart")).toContain("\"variantId\":\"v1\"");
  });

  it("applies merge summary and allows clear", () => {
    useCartStore.getState().applyMergeSummary({
      mergedLines: ["v1"],
      adjustedLines: [],
      unavailableLines: [],
      messages: ["Merged 1 item(s)."],
    });
    expect(useCartStore.getState().mergeSummary.messages).toHaveLength(1);

    useCartStore.getState().clearMergeSummary();
    expect(useCartStore.getState().mergeSummary.messages).toHaveLength(0);
  });

  it("coalesces rapid cart updates into trailing sync", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        cart: {
          items: [
            {
              productId: "p1",
              variantId: "v1",
              name: "Product One",
              variantName: "Default",
              href: "/catalog/category/product-one",
              currency: "MXN",
              unitPriceCents: 2000,
              stockOnHand: 10,
              quantity: 3,
            },
          ],
        },
        summary: emptyCartMergeSummary,
        version: 1,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    useCartStore.getState().addItem(sampleItem, 1);

    useCartStore.getState().updateQuantity("v1", 3);

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    await vi.waitFor(() => {
      expect(useCartStore.getState().cart.items[0]?.quantity).toBe(3);
      expect(useCartStore.getState().pendingVariantIds).toHaveLength(0);
      expect(useCartStore.getState().syncStatus).toBe("idle");
    });
  });

  it("skips sync error state for unauthorized server responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });
    vi.stubGlobal("fetch", fetchMock);

    useCartStore.getState().addItem(sampleItem, 1);

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(useCartStore.getState().pendingVariantIds).toHaveLength(0);
      expect(useCartStore.getState().syncError).toBeNull();
      expect(useCartStore.getState().syncStatus).toBe("idle");
    });
  });

  it("retries once after a version conflict and keeps latest cart intent", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          cart: { items: [] },
          summary: emptyCartMergeSummary,
          version: 7,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          cart: {
            items: [{ ...sampleItem, quantity: 1 }],
          },
          summary: emptyCartMergeSummary,
          version: 8,
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    useCartStore.getState().hydrateCart(emptyCartState, { version: 6 });
    useCartStore.getState().addItem(sampleItem, 1);

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(useCartStore.getState().cart.items[0]?.quantity).toBe(1);
      expect(useCartStore.getState().serverVersion).toBe(8);
      expect(useCartStore.getState().syncError).toBeNull();
    });
  });

  it("surfaces sync errors and recovers on next successful write", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          cart: {
            items: [
              {
                ...sampleItem,
                quantity: 2,
              },
            ],
          },
          summary: emptyCartMergeSummary,
          version: 2,
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    useCartStore.getState().addItem(sampleItem, 1);

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(useCartStore.getState().syncStatus).toBe("error");
      expect(useCartStore.getState().syncError).toContain("Could not sync cart");
    });

    useCartStore.getState().updateQuantity("v1", 2);

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(useCartStore.getState().syncStatus).toBe("idle");
      expect(useCartStore.getState().syncError).toBeNull();
      expect(useCartStore.getState().cart.items[0]?.quantity).toBe(2);
    });
  });

  it("syncs replaceCart and clearCart snapshots to server", async () => {
    const fetchMock = vi.fn(async (_url: unknown, init?: { body?: unknown }) => {
      const payload = typeof init?.body === "string" ? JSON.parse(init.body) as { cart?: { items: unknown[] } } : {};
      const cart = payload.cart ?? { items: [] };
      return {
        ok: true,
        json: async () => ({
          cart,
          summary: emptyCartMergeSummary,
          version: 3,
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    useCartStore.getState().replaceCart({
      items: [
        { ...sampleItem, quantity: 1 },
        {
          ...sampleItem,
          productId: "p2",
          variantId: "v2",
          name: "Product Two",
          quantity: 2,
        },
      ],
    });

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(useCartStore.getState().cart.items).toHaveLength(2);
    });

    useCartStore.getState().clearCart();

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(useCartStore.getState().cart.items).toHaveLength(0);
      expect(window.localStorage.getItem("base-ecommerce-cart")).toContain("\"items\":[]");
    });
  });

  it("handles removeItem and ignores empty variant ids while queuing sync", async () => {
    const fetchMock = vi.fn(async (_url: unknown, init?: { body?: unknown }) => {
      const payload = typeof init?.body === "string" ? JSON.parse(init.body) as { cart?: { items: unknown[] } } : {};
      const cart = payload.cart ?? { items: [] };
      return {
        ok: true,
        json: async () => ({
          cart,
          summary: emptyCartMergeSummary,
          version: 4,
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    useCartStore.getState().replaceCart({
      items: [
        { ...sampleItem, quantity: 1 },
        {
          ...sampleItem,
          variantId: "",
          quantity: 1,
        },
      ],
    });

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    useCartStore.getState().removeItem("v1");

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(useCartStore.getState().cart.items.find((item) => item.variantId === "v1")).toBeUndefined();
    });
  });
});
