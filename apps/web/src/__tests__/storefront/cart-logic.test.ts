import { describe, expect, it } from "vitest";
import {
  addCartItem,
  calculateCartTotals,
  emptyCartState,
  removeCartItem,
  updateCartItemQuantity,
} from "@/features/cart/cart";

describe("cart logic", () => {
  it("adds items and caps quantity by stock", () => {
    const cart = addCartItem(
      emptyCartState,
      {
        productId: "product-1",
        variantId: "variant-1",
        name: "Dragon Planter",
        variantName: "PLA / 0.2mm",
        href: "/catalog/3d-prints/dragon-planter",
        currency: "MXN",
        unitPriceCents: 159900,
        stockOnHand: 3,
      },
      5,
    );

    expect(cart.items[0]?.quantity).toBe(3);
  });

  it("updates quantity and removes line when quantity is set to zero", () => {
    const seeded = addCartItem(
      emptyCartState,
      {
        productId: "product-1",
        variantId: "variant-1",
        name: "Dragon Planter",
        variantName: "PLA / 0.2mm",
        href: "/catalog/3d-prints/dragon-planter",
        currency: "MXN",
        unitPriceCents: 159900,
        stockOnHand: 5,
      },
      2,
    );

    const updated = updateCartItemQuantity(seeded, "variant-1", 1);
    expect(updated.items[0]?.quantity).toBe(1);

    const removed = updateCartItemQuantity(updated, "variant-1", 0);
    expect(removed.items).toHaveLength(0);
  });

  it("computes totals and removes items explicitly", () => {
    const seeded = addCartItem(
      addCartItem(
        emptyCartState,
        {
          productId: "product-1",
          variantId: "variant-1",
          name: "Dragon Planter",
          variantName: "PLA / 0.2mm",
          href: "/catalog/3d-prints/dragon-planter",
          currency: "MXN",
          unitPriceCents: 1000,
          stockOnHand: 10,
        },
        2,
      ),
      {
        productId: "product-2",
        variantId: "variant-2",
        name: "AM5 Motherboard X",
        variantName: "ATX Edition",
        href: "/catalog/pc-components/am5-motherboard-x",
        currency: "MXN",
        unitPriceCents: 2000,
        stockOnHand: 10,
      },
      1,
    );

    const totals = calculateCartTotals(seeded);
    expect(totals.itemCount).toBe(3);
    expect(totals.subtotalCents).toBe(4000);

    const afterRemove = removeCartItem(seeded, "variant-1");
    expect(afterRemove.items).toHaveLength(1);
    expect(afterRemove.items[0]?.variantId).toBe("variant-2");
  });
});
