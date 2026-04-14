import { describe, expect, it } from "vitest";
import { addCartItem, emptyCartState, removeCartItem, updateCartItemQuantity } from "./cart";

const sampleItem = {
  productId: "p1",
  variantId: "v1",
  name: "Basil Seeds",
  variantName: "Pack",
  href: "/catalog/seeds/basil",
  currency: "MXN" as const,
  unitPriceCents: 9900,
  stockOnHand: 10,
};

describe("cart constraints", () => {
  describe("addCartItem", () => {
    it("adds a new item when stock is available", () => {
      const result = addCartItem(emptyCartState, sampleItem, 2);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.quantity).toBe(2);
    });

    it("clamps quantity to available stock", () => {
      const result = addCartItem(emptyCartState, sampleItem, 15);
      expect(result.items[0]?.quantity).toBe(10);
    });

    it("merges quantities when adding the same variant", () => {
      const first = addCartItem(emptyCartState, sampleItem, 3);
      const result = addCartItem(first, sampleItem, 4);
      expect(result.items[0]?.quantity).toBe(7);
    });

    it("caps merged quantity to stockOnHand", () => {
      const first = addCartItem(emptyCartState, sampleItem, 8);
      const result = addCartItem(first, sampleItem, 5);
      expect(result.items[0]?.quantity).toBe(10);
    });

    it("does nothing when stockOnHand is zero", () => {
      const result = addCartItem(emptyCartState, { ...sampleItem, stockOnHand: 0 }, 1);
      expect(result.items).toHaveLength(0);
    });

    it("does nothing when quantityToAdd is zero or negative", () => {
      const result = addCartItem(emptyCartState, sampleItem, 0);
      expect(result.items).toHaveLength(0);

      const negativeResult = addCartItem(emptyCartState, sampleItem, -1);
      expect(negativeResult.items).toHaveLength(0);
    });

    it("caps merged quantity using incoming stockOnHand and removes item if clamped to zero", () => {
      const first = addCartItem(emptyCartState, sampleItem, 10);
      expect(first.items).toHaveLength(1);
      expect(first.items[0]?.quantity).toBe(10);

      const result = addCartItem(first, { ...sampleItem, stockOnHand: 0 }, 1);
      expect(result.items).toHaveLength(0);
    });

    it("rejects NaN, Infinity, and non-integer quantities", () => {
      expect(addCartItem(emptyCartState, sampleItem, NaN).items).toHaveLength(0);
      expect(addCartItem(emptyCartState, sampleItem, Infinity).items).toHaveLength(0);
      expect(addCartItem(emptyCartState, sampleItem, -Infinity).items).toHaveLength(0);
      expect(addCartItem(emptyCartState, sampleItem, 1.5).items).toHaveLength(0);
    });
  });

  describe("updateCartItemQuantity", () => {
    it("updates quantity within stock limits", () => {
      const cart = addCartItem(emptyCartState, sampleItem, 2);
      const result = updateCartItemQuantity(cart, "v1", 5);
      expect(result.items[0]?.quantity).toBe(5);
    });

    it("clamps quantity to stockOnHand", () => {
      const cart = addCartItem(emptyCartState, sampleItem, 2);
      const result = updateCartItemQuantity(cart, "v1", 20);
      expect(result.items[0]?.quantity).toBe(10);
    });

    it("removes the item when quantity is set to zero", () => {
      const cart = addCartItem(emptyCartState, sampleItem, 2);
      const result = updateCartItemQuantity(cart, "v1", 0);
      expect(result.items).toHaveLength(0);
    });

    it("ignores unknown variant ids", () => {
      const result = updateCartItemQuantity(emptyCartState, "unknown", 1);
      expect(result.items).toHaveLength(0);
    });

    it("rejects non-integer quantities", () => {
      const cart = addCartItem(emptyCartState, sampleItem, 2);
      const result = updateCartItemQuantity(cart, "v1", 2.5);
      expect(result.items[0]?.quantity).toBe(2);
    });

    it("rejects NaN and Infinity for updateCartItemQuantity", () => {
      const cart = addCartItem(emptyCartState, sampleItem, 2);
      expect(updateCartItemQuantity(cart, "v1", NaN).items[0]?.quantity).toBe(2);
      expect(updateCartItemQuantity(cart, "v1", Infinity).items[0]?.quantity).toBe(2);
      expect(updateCartItemQuantity(cart, "v1", -Infinity).items[0]?.quantity).toBe(2);
    });
  });

  describe("removeCartItem", () => {
    it("removes the item by variantId", () => {
      const cart = addCartItem(emptyCartState, sampleItem, 2);
      const result = removeCartItem(cart, "v1");
      expect(result.items).toHaveLength(0);
    });
  });
});
