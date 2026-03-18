"use client";

import { create } from "zustand";
import {
  addCartItem,
  emptyCartState,
  removeCartItem,
  updateCartItemQuantity,
  type CartItem,
  type CartState,
} from "./cart";
import { emptyCartMergeSummary, type CartMergeSummary } from "./merge-summary";
import { readCartFromStorage, writeCartToStorage } from "./storage";

type CartSyncStatus = "idle" | "syncing" | "error";

type CartStoreState = {
  cart: CartState;
  serverVersion: number | null;
  mergeSummary: CartMergeSummary;
  lastSyncSummary: CartMergeSummary;
  syncStatus: CartSyncStatus;
  syncError: string | null;
  pendingVariantIds: string[];
  addItem: (item: Omit<CartItem, "quantity">, quantity: number) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  hydrateCart: (cart: CartState, options?: { version?: number | null }) => void;
  replaceCart: (cart: CartState) => void;
  applyMergeSummary: (summary: CartMergeSummary) => void;
  clearMergeSummary: () => void;
  clearCart: () => void;
};

function getInitialCartState(): CartState {
  if (typeof window === "undefined") {
    return emptyCartState;
  }
  return readCartFromStorage();
}

function persistCart(cart: CartState) {
  writeCartToStorage(cart);
}

type ServerSyncResult =
  | {
      kind: "ok";
      payload: {
        cart: CartState;
        summary: CartMergeSummary;
        version: number;
      };
    }
  | {
      kind: "conflict";
      payload: {
        cart: CartState;
        summary: CartMergeSummary;
        version: number;
      };
    }
  | {
      kind: "skip";
    }
  | {
      kind: "error";
    };

async function persistCartToServer(cart: CartState, version: number | null) {
  if (typeof window === "undefined" || typeof fetch !== "function") {
    return { kind: "skip" } satisfies ServerSyncResult;
  }

  const endpoint = new URL("/api/cart", window.location.origin).toString();

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cart,
        ...(typeof version === "number" ? { version } : {}),
      }),
    });
    if (!response.ok) {
      if (response.status === 401) {
        return { kind: "skip" } satisfies ServerSyncResult;
      }
      if (response.status === 409) {
        const payload = (await response.json()) as {
          cart: CartState;
          version: number;
          summary?: CartMergeSummary;
        };
        return {
          kind: "conflict",
          payload: {
            cart: payload.cart,
            summary: payload.summary ?? emptyCartMergeSummary,
            version: payload.version,
          },
        } satisfies ServerSyncResult;
      }
      return { kind: "error" } satisfies ServerSyncResult;
    }

    const payload = (await response.json()) as {
      cart: CartState;
      summary: CartMergeSummary;
      version: number;
    };
    return { kind: "ok", payload } satisfies ServerSyncResult;
  } catch {
    // Guest users and offline flows intentionally ignore server sync failures.
    return { kind: "error" } satisfies ServerSyncResult;
  }
}

export const useCartStore = create<CartStoreState>((set, get) => {
  let syncInFlight = false;
  let queuedSnapshot: {
    cart: CartState;
    version: number | null;
  } | null = null;
  const queuedVariantIds = new Set<string>();
  const pendingVariantIds = new Set<string>();

  const syncViewState = () => {
    const hasPendingWork = syncInFlight || queuedSnapshot !== null || pendingVariantIds.size > 0;
    const current = get();
    set({
      pendingVariantIds: Array.from(pendingVariantIds),
      syncStatus: hasPendingWork ? "syncing" : current.syncError ? "error" : "idle",
    });
  };

  const runSyncLoop = async () => {
    if (syncInFlight || !queuedSnapshot) {
      return;
    }

    syncInFlight = true;
    const snapshot = queuedSnapshot;
    queuedSnapshot = null;
    const inFlightVariantIds = new Set(queuedVariantIds);
    queuedVariantIds.clear();
    syncViewState();

    const result = await persistCartToServer(snapshot.cart, snapshot.version);

    for (const variantId of inFlightVariantIds) {
      if (!queuedVariantIds.has(variantId)) {
        pendingVariantIds.delete(variantId);
      }
    }

    if (result.kind === "error") {
      set({
        syncError: "Could not sync cart with server. Changes will retry on the next update.",
      });
    } else if (result.kind === "conflict") {
      persistCart(result.payload.cart);
      set({
        cart: result.payload.cart,
        serverVersion: result.payload.version,
        lastSyncSummary: result.payload.summary,
        syncError: null,
      });
      queuedSnapshot = {
        cart: snapshot.cart,
        version: result.payload.version,
      };
      for (const variantId of inFlightVariantIds) {
        if (variantId) {
          queuedVariantIds.add(variantId);
          pendingVariantIds.add(variantId);
        }
      }
    } else if (result.kind === "ok") {
      const payload = result.payload;
      persistCart(payload.cart);
      set((state) => ({
        cart: payload.cart,
        serverVersion: payload.version,
        lastSyncSummary: payload.summary,
        mergeSummary: payload.summary.messages.length > 0 ? payload.summary : state.mergeSummary,
        syncError: null,
      }));
    } else {
      set({ syncError: null });
    }

    syncInFlight = false;
    syncViewState();

    if (queuedSnapshot) {
      void runSyncLoop();
    }
  };

  const enqueueSync = (cart: CartState, variantIds: string[]) => {
    queuedSnapshot = {
      cart,
      version: get().serverVersion,
    };
    for (const variantId of variantIds) {
      if (!variantId) {
        continue;
      }
      queuedVariantIds.add(variantId);
      pendingVariantIds.add(variantId);
    }
    set({ syncError: null });
    syncViewState();
    void runSyncLoop();
  };

  return {
    cart: getInitialCartState(),
    serverVersion: null,
    mergeSummary: emptyCartMergeSummary,
    lastSyncSummary: emptyCartMergeSummary,
    syncStatus: "idle",
    syncError: null,
    pendingVariantIds: [],
    addItem: (item, quantity) => {
      const next = addCartItem(get().cart, item, quantity);
      persistCart(next);
      set({ cart: next });
      enqueueSync(next, [item.variantId]);
    },
    updateQuantity: (variantId, quantity) => {
      const next = updateCartItemQuantity(get().cart, variantId, quantity);
      persistCart(next);
      set({ cart: next });
      enqueueSync(next, [variantId]);
    },
    removeItem: (variantId) => {
      const next = removeCartItem(get().cart, variantId);
      persistCart(next);
      set({ cart: next });
      enqueueSync(next, [variantId]);
    },
    hydrateCart: (cart, options) => {
      queuedSnapshot = null;
      queuedVariantIds.clear();
      pendingVariantIds.clear();
      persistCart(cart);
      set({
        cart,
        serverVersion: typeof options?.version === "number" ? options.version : null,
        pendingVariantIds: [],
        syncStatus: "idle",
        syncError: null,
      });
    },
    replaceCart: (cart) => {
      const variantIds = Array.from(new Set([...get().cart.items.map((item) => item.variantId), ...cart.items.map((item) => item.variantId)]));
      persistCart(cart);
      set({ cart });
      enqueueSync(cart, variantIds);
    },
    applyMergeSummary: (summary) => {
      set({ mergeSummary: summary });
    },
    clearMergeSummary: () => {
      set({ mergeSummary: emptyCartMergeSummary });
    },
    clearCart: () => {
      const variantIds = get().cart.items.map((item) => item.variantId);
      persistCart(emptyCartState);
      set({ cart: emptyCartState });
      enqueueSync(emptyCartState, variantIds);
    },
  };
});
