export type CartItem = {
  productId: string;
  variantId: string;
  name: string;
  variantName: string;
  href: string;
  currency: "MXN" | "USD";
  unitPriceCents: number;
  stockOnHand: number;
  quantity: number;
  unavailableReason?: string;
};

export type CartState = {
  items: CartItem[];
};

export const emptyCartState: CartState = { items: [] };

function clampQuantity(quantity: number, stockOnHand: number) {
  const capped = Math.min(quantity, stockOnHand);
  return Math.max(0, capped);
}

export function addCartItem(
  cart: CartState,
  item: Omit<CartItem, "quantity">,
  quantityToAdd: number,
): CartState {
  if (!Number.isFinite(quantityToAdd) || !Number.isInteger(quantityToAdd) || quantityToAdd <= 0) {
    return cart;
  }

  const existingIndex = cart.items.findIndex((line) => line.variantId === item.variantId);
  if (existingIndex === -1) {
    if (item.stockOnHand <= 0) {
      return cart;
    }
    const quantity = clampQuantity(quantityToAdd, item.stockOnHand);
    if (quantity <= 0) {
      return cart;
    }
    return { items: [...cart.items, { ...item, quantity }] };
  }

  const existing = cart.items[existingIndex];
  if (!existing) {
    return cart;
  }
  const updatedQuantity = clampQuantity(existing.quantity + quantityToAdd, item.stockOnHand);
  if (updatedQuantity <= 0) {
    return { items: cart.items.filter((line) => line.variantId !== item.variantId) };
  }
  const nextItems = [...cart.items];
  nextItems[existingIndex] = { ...existing, ...item, quantity: updatedQuantity };

  return { items: nextItems };
}

export function updateCartItemQuantity(
  cart: CartState,
  variantId: string,
  quantity: number,
): CartState {
  const current = cart.items.find((line) => line.variantId === variantId);
  if (!current || !Number.isFinite(quantity) || !Number.isInteger(quantity)) {
    return cart;
  }

  const nextQuantity = clampQuantity(quantity, current.stockOnHand);
  if (nextQuantity <= 0) {
    return {
      items: cart.items.filter((line) => line.variantId !== variantId),
    };
  }

  return {
    items: cart.items.map((line) =>
      line.variantId === variantId ? { ...line, quantity: nextQuantity } : line,
    ),
  };
}

export function removeCartItem(cart: CartState, variantId: string): CartState {
  return {
    items: cart.items.filter((line) => line.variantId !== variantId),
  };
}

export function calculateCartTotals(cart: CartState) {
  return cart.items.reduce(
    (acc, line) => {
      if (line.unavailableReason) {
        return acc;
      }
      acc.itemCount += line.quantity;
      acc.subtotalCents += line.quantity * line.unitPriceCents;
      return acc;
    },
    { itemCount: 0, subtotalCents: 0 },
  );
}

export function getUnavailableCartItems(cart: CartState) {
  return cart.items.filter((line) => typeof line.unavailableReason === "string");
}
