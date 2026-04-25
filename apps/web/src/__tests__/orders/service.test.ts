import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";
import { orderItemsTable, ordersTable } from "@/server/db/schema";

interface MockDb {
  select: Mock<() => MockDb>;
  from: Mock<(table: unknown) => MockDb>;
  where: Mock<(...args: unknown[]) => MockDb>;
  orderBy: Mock<(...args: unknown[]) => MockDb>;
  limit: Mock<() => Promise<unknown[]>>;
  then: Mock<(onFulfilled: (value: unknown[]) => unknown) => Promise<unknown>>;
}

let currentTable: "orders" | "items" | null = null;
let ordersResult: unknown[] = [];
let itemsResult: unknown[] = [];

const mockDb: MockDb = {
  select: vi.fn<() => MockDb>(() => mockDb),
  from: vi.fn<(table: unknown) => MockDb>((table) => {
    if (table === ordersTable) currentTable = "orders";
    else if (table === orderItemsTable) currentTable = "items";
    else currentTable = null;
    return mockDb;
  }),
  where: vi.fn<(...args: unknown[]) => MockDb>(() => mockDb),
  orderBy: vi.fn<(...args: unknown[]) => MockDb>(() => mockDb),
  limit: vi.fn<() => Promise<unknown[]>>(() => {
    const result = currentTable === "orders" ? ordersResult : [];
    currentTable = null;
    return Promise.resolve(result);
  }),
  then: vi.fn<(onFulfilled: (value: unknown[]) => unknown) => Promise<unknown>>(
    (onFulfilled) => {
      const result =
        currentTable === "orders"
          ? ordersResult
          : currentTable === "items"
            ? itemsResult
            : [];
      currentTable = null;
      return Promise.resolve(onFulfilled(result));
    },
  ),
};

vi.doMock("@/server/db/client", () => ({
  getDb: vi.fn(() => mockDb),
}));

vi.doMock("drizzle-orm", () => ({
  and: (...args: unknown[]) => ({ type: "and", args }),
  eq: (a: unknown, b: unknown) => ({ type: "eq", a, b }),
  desc: (a: unknown) => ({ type: "desc", a }),
  inArray: (a: unknown, b: unknown) => ({ type: "inArray", a, b }),
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    type: "sql",
    strings,
    values,
  }),
}));

const { listOrdersForUser, listOrdersForAdmin } = await import(
  "@/server/orders/service"
);

function createOrder(overrides: Partial<typeof ordersTable.$inferSelect> = {}): typeof ordersTable.$inferSelect {
  const now = new Date();
  return {
    id: "order-1",
    userId: "user-1",
    orderNumber: "ORD-001",
    status: "pending_payment",
    paymentStatus: "pending",
    currency: "MXN",
    subtotalCents: 1000,
    discountCents: 0,
    shippingCents: 0,
    totalCents: 1000,
    itemCount: 1,
    couponCode: null,
    couponSnapshot: null,
    createdAt: now,
    updatedAt: now,
    paymentProvider: null,
    paymentSessionId: null,
    paymentReference: null,
    ...overrides,
  };
}

function createItem(
  overrides: Partial<typeof orderItemsTable.$inferSelect> = {},
): typeof orderItemsTable.$inferSelect {
  const now = new Date();
  return {
    id: "item-1",
    orderId: "order-1",
    productId: "product-1",
    variantId: "variant-1",
    name: "Basil Seeds",
    variantName: "Pack of 10",
    href: "/products/basil",
    currency: "MXN",
    unitPriceCents: 500,
    quantity: 2,
    lineTotalCents: 1000,
    unavailableReason: null,
    createdAt: now,
    ...overrides,
  };
}

describe("listOrdersForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTable = null;
    ordersResult = [];
    itemsResult = [];
  });

  it("returns empty array when user has no orders", async () => {
    ordersResult = [];
    const result = await listOrdersForUser("user-1");
    expect(result).toEqual([]);
    expect(mockDb.from).toHaveBeenCalledTimes(1);
  });

  it("returns orders with their lead items", async () => {
    const now = new Date();
    const order1 = createOrder({ id: "order-1", orderNumber: "ORD-001", createdAt: now });
    const order2 = createOrder({
      id: "order-2",
      orderNumber: "ORD-002",
      status: "paid",
      paymentStatus: "succeeded",
      totalCents: 2000,
      itemCount: 1,
      createdAt: new Date(now.getTime() - 1000),
      updatedAt: new Date(now.getTime() - 1000),
    });

    const item1 = createItem({ id: "item-1", orderId: "order-1", createdAt: now });
    const item2 = createItem({
      id: "item-2",
      orderId: "order-2",
      name: "Tomato Seeds",
      variantName: "Pack of 5",
      href: "/products/tomato",
      unitPriceCents: 2000,
      quantity: 1,
      lineTotalCents: 2000,
      createdAt: new Date(now.getTime() - 1000),
    });

    ordersResult = [order1, order2];
    itemsResult = [item1, item2];

    const result = await listOrdersForUser("user-1");

    expect(result).toHaveLength(2);
    expect(result[0]?.order.id).toBe("order-1");
    expect(result[0]?.leadItem?.id).toBe("item-1");
    expect(result[1]?.order.id).toBe("order-2");
    expect(result[1]?.leadItem?.id).toBe("item-2");
    expect(mockDb.from).toHaveBeenCalledTimes(2);
  });

  it("returns orders without items with null leadItem", async () => {
    const order1 = createOrder({ id: "order-1", itemCount: 0 });

    ordersResult = [order1];
    itemsResult = [];

    const result = await listOrdersForUser("user-1");

    expect(result).toHaveLength(1);
    expect(result[0]?.order.id).toBe("order-1");
    expect(result[0]?.leadItem).toBeNull();
    expect(mockDb.from).toHaveBeenCalledTimes(2);
  });

  it("picks the most recent item as leadItem when multiple items exist", async () => {
    const now = new Date();
    const order1 = createOrder({ id: "order-1", itemCount: 2, totalCents: 1500 });

    const olderItem = createItem({
      id: "item-1",
      orderId: "order-1",
      unitPriceCents: 500,
      quantity: 1,
      lineTotalCents: 500,
      createdAt: new Date(now.getTime() - 1000),
    });
    const newerItem = createItem({
      id: "item-2",
      orderId: "order-1",
      name: "Tomato Seeds",
      variantName: "Pack of 5",
      href: "/products/tomato",
      unitPriceCents: 1000,
      quantity: 1,
      lineTotalCents: 1000,
      createdAt: now,
    });

    ordersResult = [order1];
    itemsResult = [olderItem, newerItem];

    const result = await listOrdersForUser("user-1");

    expect(result).toHaveLength(1);
    expect(result[0]?.leadItem?.id).toBe("item-2");
  });

  it("uses at most 2 queries regardless of order count", async () => {
    const now = new Date();
    const orders = Array.from({ length: 10 }, (_, i) =>
      createOrder({
        id: `order-${i}`,
        orderNumber: `ORD-${String(i).padStart(3, "0")}`,
        createdAt: new Date(now.getTime() - i * 1000),
        updatedAt: new Date(now.getTime() - i * 1000),
      }),
    );
    const items = orders.map((o, i) =>
      createItem({
        id: `item-${i}`,
        orderId: o.id,
        createdAt: o.createdAt,
      }),
    );

    ordersResult = orders;
    itemsResult = items;

    await listOrdersForUser("user-1");

    expect(mockDb.from).toHaveBeenCalledTimes(2);
  });
});

describe("listOrdersForAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTable = null;
    ordersResult = [];
    itemsResult = [];
  });

  it("returns orders with their lead items", async () => {
    const now = new Date();
    const order1 = createOrder({ id: "order-1", orderNumber: "ORD-001", createdAt: now });
    const item1 = createItem({ id: "item-1", orderId: "order-1", createdAt: now });

    ordersResult = [order1];
    itemsResult = [item1];

    const result = await listOrdersForAdmin();

    expect(result).toHaveLength(1);
    expect(result[0]?.order.id).toBe("order-1");
    expect(result[0]?.leadItem?.id).toBe("item-1");
    expect(mockDb.from).toHaveBeenCalledTimes(2);
  });

  it("returns empty array when there are no orders", async () => {
    ordersResult = [];
    const result = await listOrdersForAdmin();
    expect(result).toEqual([]);
    expect(mockDb.from).toHaveBeenCalledTimes(1);
  });

  it("uses at most 2 queries regardless of order count", async () => {
    const now = new Date();
    const orders = Array.from({ length: 10 }, (_, i) =>
      createOrder({
        id: `order-${i}`,
        orderNumber: `ORD-${String(i).padStart(3, "0")}`,
        createdAt: new Date(now.getTime() - i * 1000),
        updatedAt: new Date(now.getTime() - i * 1000),
      }),
    );
    const items = orders.map((o, i) =>
      createItem({
        id: `item-${i}`,
        orderId: o.id,
        createdAt: o.createdAt,
      }),
    );

    ordersResult = orders;
    itemsResult = items;

    await listOrdersForAdmin();

    expect(mockDb.from).toHaveBeenCalledTimes(2);
  });
});
