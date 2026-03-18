import { eq, sql } from "drizzle-orm";
import type { CartItem, CartState } from "@/features/cart/cart";
import type { CartMergeSummary } from "@/features/cart/merge-summary";
import { getActiveStoreProfile } from "@/server/config/store-profile";
import { getDb } from "@/server/db/client";
import { cartItemsTable, cartsTable } from "@/server/db/schema";
import { getProfileRuntimeStore } from "@/server/data/runtime-store";
import { mergeCartStates, type VariantResolution } from "./merge";

function nowDate() {
  return new Date();
}

async function getOrCreateCart(userId: string) {
  const db = getDb();
  const rows = await db.select().from(cartsTable).where(eq(cartsTable.userId, userId)).limit(1);
  const existing = rows[0];
  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(cartsTable)
    .values({
      id: crypto.randomUUID(),
      userId,
      createdAt: nowDate(),
      updatedAt: nowDate(),
    })
    .returning();

  if (!created) {
    throw new Error("Could not create cart.");
  }
  return created;
}

function mapCartItemRowToCartItem(row: typeof cartItemsTable.$inferSelect): CartItem {
  return {
    productId: row.productId,
    variantId: row.variantId,
    name: row.name,
    variantName: row.variantName,
    href: row.href,
    currency: row.currency as "MXN" | "USD",
    unitPriceCents: row.unitPriceCents,
    stockOnHand: row.stockOnHand,
    quantity: row.quantity,
    ...(row.unavailableReason ? { unavailableReason: row.unavailableReason } : {}),
  };
}

export async function getUserCart(userId: string): Promise<CartState> {
  const snapshot = await getUserCartSnapshot(userId);
  return snapshot.cart;
}

export async function getUserCartSnapshot(userId: string): Promise<{
  cart: CartState;
  version: number;
}> {
  const db = getDb();
  const cart = await getOrCreateCart(userId);
  const rows = await db.select().from(cartItemsTable).where(eq(cartItemsTable.cartId, cart.id));

  return {
    cart: {
      items: rows.map(mapCartItemRowToCartItem),
    },
    version: cart.updatedAt.getTime(),
  };
}

export async function replaceUserCart(
  userId: string,
  cart: CartState,
  options?: {
    expectedVersion?: number;
  },
): Promise<
  | {
      ok: true;
      version: number;
    }
  | {
      ok: false;
      reason: "version_conflict";
      snapshot: {
        cart: CartState;
        version: number;
      };
    }
> {
  const db = getDb();
  const cartRow = await getOrCreateCart(userId);
  const currentVersion = cartRow.updatedAt.getTime();
  if (typeof options?.expectedVersion === "number" && options.expectedVersion !== currentVersion) {
    const rows = await db.select().from(cartItemsTable).where(eq(cartItemsTable.cartId, cartRow.id));
    return {
      ok: false,
      reason: "version_conflict",
      snapshot: {
        cart: {
          items: rows.map(mapCartItemRowToCartItem),
        },
        version: currentVersion,
      },
    };
  }

  const cartId = cartRow.id;
  await db.delete(cartItemsTable).where(eq(cartItemsTable.cartId, cartId));

  if (cart.items.length > 0) {
    for (const line of cart.items) {
      const updatedAt = nowDate();
      await db
        .insert(cartItemsTable)
        .values({
          cartId,
          variantId: line.variantId,
          productId: line.productId,
          name: line.name,
          variantName: line.variantName,
          href: line.href,
          currency: line.currency,
          unitPriceCents: line.unitPriceCents,
          stockOnHand: line.stockOnHand,
          quantity: line.quantity,
          unavailableReason: line.unavailableReason,
          updatedAt,
        })
        .onConflictDoUpdate({
          target: [cartItemsTable.cartId, cartItemsTable.variantId],
          set: {
            productId: line.productId,
            name: line.name,
            variantName: line.variantName,
            href: line.href,
            currency: line.currency,
            unitPriceCents: line.unitPriceCents,
            stockOnHand: line.stockOnHand,
            quantity: line.quantity,
            unavailableReason: line.unavailableReason,
            updatedAt,
          },
        });
    }
  }

  const now = nowDate();
  await db
    .update(cartsTable)
    .set({
      updatedAt: now,
    })
    .where(eq(cartsTable.id, cartId));

  return {
    ok: true,
    version: now.getTime(),
  };
}

export function resolveVariantFromActiveCatalog(variantId: string): VariantResolution {
  const profile = getActiveStoreProfile();
  const store = getProfileRuntimeStore(profile);
  const variant = store.variants.find((entry) => entry.id === variantId);
  if (!variant) {
    return {
      status: "unavailable",
      reason: "Variant not found.",
    };
  }

  const product = store.products.find((entry) => entry.id === variant.productId);
  if (!product) {
    return {
      status: "unavailable",
      reason: "Product not found.",
    };
  }

  const category = store.categories.find((entry) => entry.id === product.categoryId);
  const href = category ? `/catalog/${category.slug}/${product.slug}` : `/catalog`;

  if (product.status !== "active" || variant.stockOnHand <= 0) {
    return {
      status: "unavailable",
      reason: "Variant is out of stock.",
      fallbackItem: {
        productId: product.id,
        variantId: variant.id,
        name: product.name,
        variantName: variant.name,
        href,
        currency: product.currency,
        unitPriceCents: variant.priceCents,
        stockOnHand: variant.stockOnHand,
        unavailableReason: "Variant is out of stock.",
      },
    };
  }

  return {
    status: "available",
    item: {
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      variantName: variant.name,
      href,
      currency: product.currency,
      unitPriceCents: variant.priceCents,
      stockOnHand: variant.stockOnHand,
    },
    stockOnHand: variant.stockOnHand,
  };
}

export async function reconcileCartState(cart: CartState): Promise<{
  cart: CartState;
  summary: CartMergeSummary;
}> {
  return mergeCartStates({
    guestCart: cart,
    serverCart: { items: [] },
    resolveVariant: resolveVariantFromActiveCatalog,
  });
}

export async function reconcileCartStateAgainstServer(input: {
  requestedCart: CartState;
  serverCart: CartState;
}): Promise<{
  cart: CartState;
  summary: CartMergeSummary;
}> {
  return mergeCartStates({
    guestCart: input.requestedCart,
    serverCart: input.serverCart,
    resolveVariant: resolveVariantFromActiveCatalog,
  });
}

export function getVariantAvailability(variantId: string) {
  const resolution = resolveVariantFromActiveCatalog(variantId);
  if (resolution.status === "available") {
    return {
      variantId,
      stockOnHand: resolution.stockOnHand,
      isPurchasable: true,
    };
  }

  return {
    variantId,
    stockOnHand: resolution.fallbackItem?.stockOnHand ?? 0,
    isPurchasable: false,
    reason: resolution.reason,
  };
}

export async function mergeGuestCartIntoUserCart(userId: string, guestCart: CartState): Promise<{
  cart: CartState;
  summary: CartMergeSummary;
  version: number;
}> {
  const existing = await getUserCartSnapshot(userId);
  const merged = await mergeCartStates({
    guestCart,
    serverCart: existing.cart,
    resolveVariant: resolveVariantFromActiveCatalog,
  });
  const replaceResult = await replaceUserCart(userId, merged.cart);
  if (!replaceResult.ok) {
    return {
      ...merged,
      version: replaceResult.snapshot.version,
    };
  }

  return {
    ...merged,
    version: replaceResult.version,
  };
}

export async function getActiveUserCount() {
  const db = getDb();
  const rows = await db.select({ count: sql<number>`count(*)` }).from(cartsTable).limit(1);
  return Number(rows[0]?.count ?? 0);
}
