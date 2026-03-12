"use client";

import { type CartState, emptyCartState } from "./cart";

const CART_STORAGE_KEY = "base-ecommerce-cart";

export function readCartFromStorage(): CartState {
  if (typeof window === "undefined") {
    return emptyCartState;
  }

  const raw = window.localStorage.getItem(CART_STORAGE_KEY);
  if (!raw) {
    return emptyCartState;
  }

  try {
    const parsed = JSON.parse(raw) as CartState;
    if (!parsed || !Array.isArray(parsed.items)) {
      return emptyCartState;
    }
    return parsed;
  } catch {
    return emptyCartState;
  }
}

export function writeCartToStorage(cart: CartState) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}
