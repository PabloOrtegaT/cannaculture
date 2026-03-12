import { type InventoryLedgerEntry } from "./schemas";

export function hasValidCompareAtPrice(priceCents: number, compareAtPriceCents?: number) {
  if (typeof compareAtPriceCents !== "number") {
    return true;
  }
  return compareAtPriceCents > priceCents;
}

export function assertValidCompareAtPrice(priceCents: number, compareAtPriceCents?: number) {
  if (!hasValidCompareAtPrice(priceCents, compareAtPriceCents)) {
    throw new Error("compareAtPriceCents must be greater than priceCents.");
  }
}

export function calculateStockOnHand(entries: readonly InventoryLedgerEntry[]) {
  return entries.reduce((total, entry) => total + entry.quantityDelta, 0);
}

export function assertInventoryNeverNegative(entries: readonly InventoryLedgerEntry[]) {
  let runningStock = 0;
  for (const entry of entries) {
    runningStock += entry.quantityDelta;
    if (runningStock < 0) {
      throw new Error(`Inventory became negative after entry "${entry.id}".`);
    }
  }
}
