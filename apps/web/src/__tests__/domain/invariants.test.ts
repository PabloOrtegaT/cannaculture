import { describe, expect, it } from "vitest";
import {
  assertInventoryNeverNegative,
  assertValidCompareAtPrice,
  calculateStockOnHand,
  inventoryLedgerEntrySchema,
} from "@base-ecommerce/domain";

describe("catalog invariants", () => {
  it("accepts valid compare-at pricing", () => {
    expect(() => assertValidCompareAtPrice(1000, 1200)).not.toThrow();
  });

  it("rejects invalid compare-at pricing", () => {
    expect(() => assertValidCompareAtPrice(1000, 800)).toThrow();
  });

  it("computes stock from inventory ledger", () => {
    const entries = [
      inventoryLedgerEntrySchema.parse({
        id: "ec710ce6-2ab8-4ea8-b94d-4db340f67f4f",
        productId: "4f6fb94d-fb44-46eb-9885-dd8b16be6fdb",
        quantityDelta: 10,
        reason: "initial_stock",
        createdAt: "2026-03-09T12:00:00.000Z",
      }),
      inventoryLedgerEntrySchema.parse({
        id: "045c6af5-52f8-422c-822e-16f1153a6af4",
        productId: "4f6fb94d-fb44-46eb-9885-dd8b16be6fdb",
        quantityDelta: -3,
        reason: "purchase",
        createdAt: "2026-03-09T12:10:00.000Z",
      }),
    ];

    expect(calculateStockOnHand(entries)).toBe(7);
    expect(() => assertInventoryNeverNegative(entries)).not.toThrow();
  });

  it("fails when inventory history goes negative", () => {
    const entries = [
      inventoryLedgerEntrySchema.parse({
        id: "7b75d8cc-6ff5-4ecc-8a2a-befefad26f5c",
        productId: "4f6fb94d-fb44-46eb-9885-dd8b16be6fdb",
        quantityDelta: 2,
        reason: "initial_stock",
        createdAt: "2026-03-09T12:00:00.000Z",
      }),
      inventoryLedgerEntrySchema.parse({
        id: "a4ce57cb-f62e-42c4-b285-8670f78f1de7",
        productId: "4f6fb94d-fb44-46eb-9885-dd8b16be6fdb",
        quantityDelta: -5,
        reason: "purchase",
        createdAt: "2026-03-09T12:10:00.000Z",
      }),
    ];

    expect(() => assertInventoryNeverNegative(entries)).toThrow();
  });
});
