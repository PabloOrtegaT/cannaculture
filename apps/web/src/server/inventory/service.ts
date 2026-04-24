import { eq, inArray, sql } from "drizzle-orm";
import { getProfileRuntimeStore } from "@/server/data/runtime-store";
import { getDb } from "@/server/db/client";
import { inventoryHoldsTable, inventoryStocksTable, orderItemsTable } from "@/server/db/schema";

export type StockConflictLine = {
  variantId: string;
  requestedQty: number;
  availableQty: number;
  reason: string;
};

type CatalogVariantContext = {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  href: string;
  currency: "MXN" | "USD";
  unitPriceCents: number;
  variantCatalogStockOnHand: number;
  isProductActive: boolean;
};

export type VariantAvailability = {
  variantId: string;
  stockOnHand: number;
  availableToSell: number;
  isPurchasable: boolean;
  reason?: string;
};

type CheckoutStockValidationResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      code: "insufficient_stock";
      lines: StockConflictLine[];
    };

function nowDate() {
  return new Date();
}

function normalizeQuantity(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.trunc(value));
}

function groupLines(
  lines: Array<{
    variantId: string;
    quantity: number;
  }>,
) {
  const grouped = new Map<string, number>();
  for (const line of lines) {
    const quantity = normalizeQuantity(line.quantity);
    if (!line.variantId || quantity <= 0) {
      continue;
    }
    grouped.set(line.variantId, (grouped.get(line.variantId) ?? 0) + quantity);
  }
  return Array.from(grouped.entries()).map(([variantId, quantity]) => ({
    variantId,
    quantity,
  }));
}

function findCatalogVariantContext(variantId: string): CatalogVariantContext | null {
  const store = getProfileRuntimeStore();
  const variant = store.variants.find((entry) => entry.id === variantId);
  if (!variant) {
    return null;
  }

  const product = store.products.find((entry) => entry.id === variant.productId);
  if (!product) {
    return null;
  }

  const category = store.categories.find((entry) => entry.id === product.categoryId);
  const href = category ? `/catalog/${category.slug}/${product.slug}` : "/catalog";
  return {
    productId: product.id,
    variantId: variant.id,
    productName: product.name,
    variantName: variant.name,
    href,
    currency: product.currency,
    unitPriceCents: variant.priceCents,
    variantCatalogStockOnHand: variant.stockOnHand,
    isProductActive: product.status === "active",
  };
}

async function getInventoryStockRow(variantId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(inventoryStocksTable)
    .where(eq(inventoryStocksTable.variantId, variantId))
    .limit(1);
  return rows[0] ?? null;
}

async function ensureInventoryStockRow(variantId: string, catalogStockOnHand: number) {
  const db = getDb();
  const now = nowDate();
  const normalizedOnHandQty = Math.max(0, Math.trunc(catalogStockOnHand));
  await db
    .insert(inventoryStocksTable)
    .values({
      variantId,
      onHandQty: normalizedOnHandQty,
      availableQty: normalizedOnHandQty,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({
      target: inventoryStocksTable.variantId,
    });
}

export async function getCanonicalVariantAvailability(
  variantId: string,
): Promise<VariantAvailability> {
  const context = findCatalogVariantContext(variantId);
  if (!context) {
    return {
      variantId,
      stockOnHand: 0,
      availableToSell: 0,
      isPurchasable: false,
      reason: "Variant not found.",
    };
  }

  let stockRow = await getInventoryStockRow(variantId);
  if (!stockRow) {
    await ensureInventoryStockRow(variantId, context.variantCatalogStockOnHand);
    stockRow = await getInventoryStockRow(variantId);
  }
  const onHandQty = Math.max(0, Number(stockRow?.onHandQty ?? context.variantCatalogStockOnHand));
  const availableToSell = Math.max(0, Number(stockRow?.availableQty ?? onHandQty));

  if (!context.isProductActive) {
    return {
      variantId,
      stockOnHand: onHandQty,
      availableToSell: 0,
      isPurchasable: false,
      reason: "Product is not available.",
    };
  }

  if (availableToSell <= 0) {
    return {
      variantId,
      stockOnHand: onHandQty,
      availableToSell: 0,
      isPurchasable: false,
      reason: "Variant is out of stock.",
    };
  }

  return {
    variantId,
    stockOnHand: onHandQty,
    availableToSell,
    isPurchasable: true,
  };
}

export async function validateInventoryForOrder(input: {
  lines: Array<{
    variantId: string;
    quantity: number;
  }>;
}): Promise<CheckoutStockValidationResult> {
  const grouped = groupLines(input.lines);
  if (grouped.length === 0) {
    return {
      ok: false,
      code: "insufficient_stock",
      lines: [
        {
          variantId: "unknown",
          requestedQty: 0,
          availableQty: 0,
          reason: "Cart has no purchasable items.",
        },
      ],
    };
  }

  const availabilities = await Promise.all(
    grouped.map((line) => getCanonicalVariantAvailability(line.variantId)),
  );

  const shortages: StockConflictLine[] = [];
  for (let index = 0; index < grouped.length; index += 1) {
    const line = grouped[index];
    if (!line) {
      continue;
    }
    const availability = availabilities[index];
    if (
      !availability ||
      !availability.isPurchasable ||
      availability.availableToSell < line.quantity
    ) {
      shortages.push({
        variantId: line.variantId,
        requestedQty: line.quantity,
        availableQty: availability?.availableToSell ?? 0,
        reason: availability?.reason ?? "Insufficient stock.",
      });
    }
  }

  if (shortages.length > 0) {
    return {
      ok: false,
      code: "insufficient_stock",
      lines: shortages,
    };
  }

  return {
    ok: true,
  };
}

export async function decrementInventoryForPaidOrder(orderId: string) {
  const db = getDb();
  const rows = await db
    .select({
      variantId: orderItemsTable.variantId,
      quantity: orderItemsTable.quantity,
    })
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, orderId));

  if (rows.length === 0) {
    return {
      decrementedCount: 0,
    };
  }

  const now = nowDate();
  const grouped = groupLines(rows);

  const ensureValues = grouped.map((row) => {
    const context = findCatalogVariantContext(row.variantId);
    const normalizedOnHandQty = Math.max(0, Math.trunc(context?.variantCatalogStockOnHand ?? 0));
    return {
      variantId: row.variantId,
      onHandQty: normalizedOnHandQty,
      availableQty: normalizedOnHandQty,
      createdAt: now,
      updatedAt: now,
    };
  });

  if (ensureValues.length > 0) {
    await db.insert(inventoryStocksTable).values(ensureValues).onConflictDoNothing({
      target: inventoryStocksTable.variantId,
    });
  }

  if (grouped.length > 0) {
    const batchItems = grouped.map((row) =>
      db
        .update(inventoryStocksTable)
        .set({
          onHandQty: sql`${inventoryStocksTable.onHandQty} - ${row.quantity}`,
          availableQty: sql`${inventoryStocksTable.availableQty} - ${row.quantity}`,
          updatedAt: now,
        })
        .where(eq(inventoryStocksTable.variantId, row.variantId)),
    );
    if (batchItems.length > 0) {
      await db.batch(batchItems as [typeof batchItems[number], ...typeof batchItems[number][]]);
    }
  }

  return {
    decrementedCount: grouped.length,
  };
}

export async function syncInventoryStockForVariant(variantId: string, nextOnHandQty: number) {
  const db = getDb();
  const now = nowDate();
  const normalizedOnHandQty = Math.max(0, Math.trunc(nextOnHandQty));

  await db
    .insert(inventoryStocksTable)
    .values({
      variantId,
      onHandQty: normalizedOnHandQty,
      availableQty: normalizedOnHandQty,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: inventoryStocksTable.variantId,
      set: {
        onHandQty: normalizedOnHandQty,
        availableQty: normalizedOnHandQty,
        updatedAt: now,
      },
    });
}

export async function syncInventoryFromRuntimeCatalogForVariant(variantId: string) {
  const context = findCatalogVariantContext(variantId);
  if (!context) {
    return;
  }
  await syncInventoryStockForVariant(variantId, context.variantCatalogStockOnHand);
}

export async function syncInventoryFromRuntimeCatalogForProduct(productId: string) {
  const store = getProfileRuntimeStore();
  const variants = store.variants.filter((variant) => variant.productId === productId);
  await Promise.all(
    variants.map((variant) => syncInventoryStockForVariant(variant.id, variant.stockOnHand)),
  );
}

export async function syncInventoryFromRuntimeCatalog() {
  const store = getProfileRuntimeStore();
  await Promise.all(
    store.variants.map((variant) => syncInventoryStockForVariant(variant.id, variant.stockOnHand)),
  );
}

// ── Inventory holds (F4-5) ──────────────────────────────────────────────

const HOLD_TTL_MS = 15 * 60 * 1000; // 15 minutes

export function calculateHoldExpiresAt() {
  return new Date(Date.now() + HOLD_TTL_MS);
}

export async function createInventoryHoldsForOrder(input: {
  orderId: string;
  lines: Array<{ variantId: string; quantity: number }>;
}) {
  const db = getDb();
  const now = nowDate();
  const expiresAt = calculateHoldExpiresAt();
  const grouped = groupLines(input.lines);

  if (grouped.length === 0) return { holdCount: 0 };

  const holdValues = grouped.map((row) => ({
    id: crypto.randomUUID(),
    orderId: input.orderId,
    variantId: row.variantId,
    quantity: row.quantity,
    expiresAt,
    createdAt: now,
  }));

  await db.insert(inventoryHoldsTable).values(holdValues);

  return { holdCount: grouped.length };
}

export async function releaseInventoryHoldsForOrder(orderId: string) {
  const db = getDb();
  await db.delete(inventoryHoldsTable).where(eq(inventoryHoldsTable.orderId, orderId));
}

export async function restoreInventoryFromHolds(orderId: string) {
  const db = getDb();
  const holds = await db
    .select()
    .from(inventoryHoldsTable)
    .where(eq(inventoryHoldsTable.orderId, orderId));

  if (holds.length === 0) return { restoredCount: 0 };

  const now = nowDate();

  const restoreStatements = holds.map((hold) =>
    db
      .update(inventoryStocksTable)
      .set({
        onHandQty: sql`${inventoryStocksTable.onHandQty} + ${hold.quantity}`,
        updatedAt: now,
      })
      .where(eq(inventoryStocksTable.variantId, hold.variantId)),
  );

  const first = restoreStatements[0];
  if (first) {
    await db.batch([first, ...restoreStatements.slice(1)]);
  }

  await db.delete(inventoryHoldsTable).where(eq(inventoryHoldsTable.orderId, orderId));

  return { restoredCount: holds.length };
}

export async function sweepExpiredInventoryHolds() {
  const db = getDb();
  const now = nowDate();

  const expired = await db
    .select()
    .from(inventoryHoldsTable)
    .where(sql`${inventoryHoldsTable.expiresAt} < ${now.getTime()}`);

  if (expired.length === 0) return { sweptCount: 0, restoredCount: 0 };

  const now2 = nowDate();

  const restoreStatements = expired.map((hold) =>
    db
      .update(inventoryStocksTable)
      .set({
        onHandQty: sql`${inventoryStocksTable.onHandQty} + ${hold.quantity}`,
        updatedAt: now2,
      })
      .where(eq(inventoryStocksTable.variantId, hold.variantId)),
  );

  if (restoreStatements.length > 0) {
    await db.batch(restoreStatements as [typeof restoreStatements[number], ...typeof restoreStatements[number][]]);
  }

  const expiredIds = expired.map((h) => h.id);
  if (expiredIds.length > 0) {
    await db.delete(inventoryHoldsTable).where(inArray(inventoryHoldsTable.id, expiredIds));
  }

  return { sweptCount: expired.length, restoredCount: expired.length };
}
