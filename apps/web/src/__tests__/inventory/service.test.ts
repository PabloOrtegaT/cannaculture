import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockBatch = vi.fn();
const mockInArray = vi.fn();

const mockDb = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  batch: mockBatch,
};

vi.doMock("@/server/db/client", () => ({
  getDb: vi.fn(() => mockDb),
}));

vi.doMock("@/server/db/schema", () => ({
  inventoryStocksTable: {
    variantId: "variantId",
    onHandQty: "onHandQty",
    availableQty: "availableQty",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  inventoryHoldsTable: {
    id: "id",
    orderId: "orderId",
    variantId: "variantId",
    quantity: "quantity",
    expiresAt: "expiresAt",
    createdAt: "createdAt",
  },
  orderItemsTable: {
    id: "id",
    orderId: "orderId",
    productId: "productId",
    variantId: "variantId",
    quantity: "quantity",
    name: "name",
    variantName: "variantName",
    href: "href",
    currency: "currency",
    unitPriceCents: "unitPriceCents",
    lineTotalCents: "lineTotalCents",
    unavailableReason: "unavailableReason",
    createdAt: "createdAt",
  },
}));

vi.doMock("drizzle-orm", () => ({
  eq: (a: unknown, b: unknown) => ({ type: "eq", a, b }),
  inArray: (a: unknown, b: unknown) => {
    mockInArray(a, b);
    return { type: "inArray", a, b };
  },
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    type: "sql",
    strings,
    values,
  }),
}));

const basilVariantId = "49f3192f-e4c6-4262-8dda-614e92db9e3f";
const basilProductId = "64043f75-f238-4ca8-a45d-1ee4932e986c";

vi.doMock("@/server/data/runtime-store", () => ({
  getProfileRuntimeStore: vi.fn(() => ({
    categories: [
      {
        id: "95fb9238-d814-4dff-b425-c94f5ff955ef",
        slug: "plant-seeds",
        name: "Plant Seeds",
      },
    ],
    products: [
      {
        id: basilProductId,
        categoryId: "95fb9238-d814-4dff-b425-c94f5ff955ef",
        name: "Basil Seeds Pack",
        slug: "basil-seeds-pack",
        status: "active",
        currency: "MXN",
        priceCents: 9900,
      },
    ],
    variants: [
      {
        id: basilVariantId,
        productId: basilProductId,
        sku: "SEED-BASIL-001-PACK",
        name: "Starter Pack",
        priceCents: 9900,
        stockOnHand: 25,
      },
    ],
    newsPosts: [],
    promoBanners: [],
    featuredSales: [],
    coupons: [],
    orders: [],
  })),
}));

function setupSelectChain(result: unknown[]) {
  mockSelect.mockReturnValue({
    from: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve(result)),
    })),
  });
}

function setupInsertChain(statement: unknown = "insert-stmt") {
  mockInsert.mockReturnValue({
    values: vi.fn(() => ({
      onConflictDoNothing: vi.fn(() => statement),
      returning: vi.fn(() => Promise.resolve([])),
    })),
  });
}

function setupUpdateChain(statement: unknown = "update-stmt") {
  mockUpdate.mockReturnValue({
    set: vi.fn(() => ({
      where: vi.fn(() => statement),
    })),
  });
}

function setupDeleteChain(statement: unknown = "delete-stmt") {
  mockDelete.mockReturnValue({
    where: vi.fn(() => statement),
  });
}

describe("decrementInventoryForPaidOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBatch.mockResolvedValue([]);
  });

  it("returns decrementedCount 0 when order has no items", async () => {
    const { decrementInventoryForPaidOrder } = await import(
      "@/server/inventory/service"
    );

    setupSelectChain([]);

    const result = await decrementInventoryForPaidOrder("order-1");
    expect(result.decrementedCount).toBe(0);
    expect(mockBatch).not.toHaveBeenCalled();
  });

  it("batches ensure insert and all updates together", async () => {
    const { decrementInventoryForPaidOrder } = await import(
      "@/server/inventory/service"
    );

    setupSelectChain([
      { variantId: basilVariantId, quantity: 3 },
    ]);
    setupInsertChain("ensure-stmt");
    setupUpdateChain("update-stmt");

    const result = await decrementInventoryForPaidOrder("order-1");

    expect(result.decrementedCount).toBe(1);
    expect(mockBatch).toHaveBeenCalledTimes(1);

    const batchStatements = mockBatch.mock.calls[0]![0] as unknown[];
    // Should have 2 statements: ensure insert + 1 update
    expect(batchStatements.length).toBe(2);
    expect(batchStatements[0]).toBe("ensure-stmt");
    expect(batchStatements[1]).toBe("update-stmt");
  });

  it("batches multiple variant updates with ensure insert", async () => {
    const { decrementInventoryForPaidOrder } = await import(
      "@/server/inventory/service"
    );

    const variant2Id = "10000000-0000-4000-8000-000000003101";

    setupSelectChain([
      { variantId: basilVariantId, quantity: 2 },
      { variantId: variant2Id, quantity: 1 },
    ]);
    setupInsertChain("ensure-stmt");
    setupUpdateChain("update-stmt");

    const result = await decrementInventoryForPaidOrder("order-1");

    expect(result.decrementedCount).toBe(2);
    expect(mockBatch).toHaveBeenCalledTimes(1);

    const batchStatements = mockBatch.mock.calls[0]![0] as unknown[];
    // Should have 3 statements: ensure insert + 2 updates
    expect(batchStatements.length).toBe(3);
    expect(batchStatements[0]).toBe("ensure-stmt");
    expect(batchStatements[1]).toBe("update-stmt");
    expect(batchStatements[2]).toBe("update-stmt");
  });

  it("omits ensure statement when grouped is empty (edge case)", async () => {
    const { decrementInventoryForPaidOrder } = await import(
      "@/server/inventory/service"
    );

    // All items have invalid quantities (0 or negative)
    setupSelectChain([
      { variantId: basilVariantId, quantity: 0 },
    ]);
    setupUpdateChain("update-stmt");

    const result = await decrementInventoryForPaidOrder("order-1");

    expect(result.decrementedCount).toBe(0);
    expect(mockBatch).not.toHaveBeenCalled();
  });
});

describe("restoreInventoryFromHolds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBatch.mockResolvedValue([]);
  });

  it("batches restore updates and delete together", async () => {
    const { restoreInventoryFromHolds } = await import(
      "@/server/inventory/service"
    );

    setupSelectChain([
      { id: "hold-1", orderId: "order-1", variantId: basilVariantId, quantity: 3 },
    ]);
    setupUpdateChain("restore-stmt");
    setupDeleteChain("delete-stmt");

    const result = await restoreInventoryFromHolds("order-1");

    expect(result.restoredCount).toBe(1);
    expect(mockBatch).toHaveBeenCalledTimes(1);

    const batchStatements = mockBatch.mock.calls[0]![0] as unknown[];
    // Should have 2 statements: 1 restore update + 1 delete
    expect(batchStatements.length).toBe(2);
    expect(batchStatements[0]).toBe("restore-stmt");
    expect(batchStatements[1]).toBe("delete-stmt");
  });

  it("returns restoredCount 0 when no holds exist", async () => {
    const { restoreInventoryFromHolds } = await import(
      "@/server/inventory/service"
    );

    setupSelectChain([]);

    const result = await restoreInventoryFromHolds("order-1");
    expect(result.restoredCount).toBe(0);
    expect(mockBatch).not.toHaveBeenCalled();
  });
});

describe("sweepExpiredInventoryHolds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBatch.mockResolvedValue([]);
  });

  it("batches restore updates and delete together", async () => {
    const { sweepExpiredInventoryHolds } = await import(
      "@/server/inventory/service"
    );

    setupSelectChain([
      { id: "hold-1", orderId: "order-1", variantId: basilVariantId, quantity: 3 },
    ]);
    setupUpdateChain("restore-stmt");
    setupDeleteChain("delete-stmt");

    const result = await sweepExpiredInventoryHolds();

    expect(result.sweptCount).toBe(1);
    expect(result.restoredCount).toBe(1);
    expect(mockBatch).toHaveBeenCalledTimes(1);

    const batchStatements = mockBatch.mock.calls[0]![0] as unknown[];
    // Should have 2 statements: 1 restore update + 1 delete
    expect(batchStatements.length).toBe(2);
    expect(batchStatements[0]).toBe("restore-stmt");
    expect(batchStatements[1]).toBe("delete-stmt");
  });

  it("returns zero counts when no expired holds exist", async () => {
    const { sweepExpiredInventoryHolds } = await import(
      "@/server/inventory/service"
    );

    setupSelectChain([]);

    const result = await sweepExpiredInventoryHolds();
    expect(result.sweptCount).toBe(0);
    expect(result.restoredCount).toBe(0);
    expect(mockBatch).not.toHaveBeenCalled();
  });
});
