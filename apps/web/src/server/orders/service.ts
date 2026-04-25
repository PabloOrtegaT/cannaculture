import { and, desc, eq, sql } from "drizzle-orm";
import type { CartState } from "@/features/cart/cart";
import { getDb } from "@/server/db/client";
import {
  couponRedemptionsTable,
  inventoryHoldsTable,
  inventoryStocksTable,
  orderItemsTable,
  ordersTable,
  orderStatusTimelineTable,
  paymentAttemptsTable,
} from "@/server/db/schema";
import {
  assertValidOrderStatusTransition,
  assertValidPaymentStatusTransition,
} from "./state-machine";
import type {
  CheckoutPaymentSession,
  CheckoutTotals,
  OrderCouponSnapshot,
  OrderStatus,
  PaymentStatus,
} from "./types";

function nowDate() {
  return new Date();
}

function createOrderNumber() {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = crypto.randomUUID().split("-")[0]?.toUpperCase() ?? "000000";
  return `ORD-${day}-${suffix}`;
}

export type CheckoutOrder = typeof ordersTable.$inferSelect;

export async function createPendingCheckoutOrder(input: {
  userId: string;
  cart: CartState;
  totals: CheckoutTotals;
  couponCode?: string;
  couponSnapshot?: OrderCouponSnapshot;
  couponRedemption?: { couponId: string; orderId: string; userId: string };
  id?: string;
  orderNumber?: string;
  holdLines?: Array<{ variantId: string; quantity: number }>;
}) {
  const db = getDb();
  const createdAt = nowDate();
  const orderNumber = input.orderNumber ?? createOrderNumber();
  const orderId = input.id ?? crypto.randomUUID();

  const orderValues = {
    id: orderId,
    userId: input.userId,
    orderNumber,
    status: "pending_payment" as const,
    paymentStatus: "pending" as const,
    currency: input.totals.currency,
    subtotalCents: input.totals.subtotalCents,
    discountCents: input.totals.discountCents,
    shippingCents: input.totals.shippingCents,
    totalCents: input.totals.totalCents,
    itemCount: input.totals.itemCount,
    couponCode: input.couponCode,
    couponSnapshot: input.couponSnapshot ? JSON.stringify(input.couponSnapshot) : null,
    createdAt,
    updatedAt: createdAt,
  };

  const itemValues = input.cart.items.map((line) => ({
    id: crypto.randomUUID(),
    orderId: orderId,
    productId: line.productId,
    variantId: line.variantId,
    name: line.name,
    variantName: line.variantName,
    href: line.href,
    currency: line.currency,
    unitPriceCents: line.unitPriceCents,
    quantity: line.quantity,
    lineTotalCents: line.quantity * line.unitPriceCents,
    unavailableReason: line.unavailableReason,
    createdAt,
  }));

  const timelineValues = {
    id: crypto.randomUUID(),
    orderId: orderId,
    status: "pending_payment" as const,
    actorType: "customer" as const,
    actorId: input.userId,
    note: "Checkout session initialized.",
    createdAt,
  };

  const holdStatements = [];

  // F4-5: create inventory holds and decrement onHand + available within the same batch
  if (input.holdLines && input.holdLines.length > 0) {
    const holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const holdValues = input.holdLines.map((line) => ({
      id: crypto.randomUUID(),
      orderId: orderId,
      variantId: line.variantId,
      quantity: line.quantity,
      expiresAt: holdExpiresAt,
      createdAt,
    }));

    holdStatements.push(db.insert(inventoryHoldsTable).values(holdValues));

    for (const line of input.holdLines) {
      // Use raw subtraction guarded by the database trigger (0006 migration).
      // If concurrent checkout consumed the stock first, the trigger aborts
      // the transaction and the entire batch rolls back.
      holdStatements.push(
        db
          .update(inventoryStocksTable)
          .set({
            onHandQty: sql`${inventoryStocksTable.onHandQty} - ${line.quantity}`,
            availableQty: sql`${inventoryStocksTable.availableQty} - ${line.quantity}`,
            updatedAt: createdAt,
          })
          .where(eq(inventoryStocksTable.variantId, line.variantId)),
      );
    }
  }

  const redemptionStatement = input.couponRedemption
    ? db.insert(couponRedemptionsTable).values({
        id: crypto.randomUUID(),
        couponId: input.couponRedemption.couponId,
        orderId: input.couponRedemption.orderId,
        userId: input.couponRedemption.userId,
        createdAt,
      })
    : null;

  const batchStatements = [
    db.insert(ordersTable).values(orderValues).returning(),
    db.insert(orderItemsTable).values(itemValues),
    db.insert(orderStatusTimelineTable).values(timelineValues),
    ...(redemptionStatement ? [redemptionStatement] : []),
    ...holdStatements,
  ];

  try {
    const batchResult = await db.batch(
      batchStatements as [typeof batchStatements[number], ...typeof batchStatements[number][]],
    );

    const orderRows = batchResult[0];

    if (!Array.isArray(orderRows) || orderRows.length === 0) {
      throw new Error("Could not create checkout order.");
    }

    return orderRows[0];
  } catch (error) {
    // Detect trigger abort from concurrent stock consumption (0006 migration).
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("onHandQty would go negative")) {
      throw new Error(
        "StockConflict: Another customer purchased the last items while you were checking out. Please refresh your cart.",
      );
    }
    throw error;
  }
}

export async function attachCheckoutPaymentSession(input: {
  orderId: string;
  paymentSession: CheckoutPaymentSession;
  amountCents: number;
  currency: "MXN" | "USD";
}) {
  const db = getDb();
  const updatedAt = nowDate();
  await db
    .update(ordersTable)
    .set({
      paymentProvider: input.paymentSession.providerId,
      paymentSessionId: input.paymentSession.sessionId,
      updatedAt,
    })
    .where(eq(ordersTable.id, input.orderId));

  await db.insert(paymentAttemptsTable).values({
    id: crypto.randomUUID(),
    orderId: input.orderId,
    provider: input.paymentSession.providerId,
    providerSessionId: input.paymentSession.sessionId,
    status: "created",
    checkoutUrl: input.paymentSession.checkoutUrl,
    amountCents: input.amountCents,
    currency: input.currency,
    createdAt: updatedAt,
    updatedAt,
  });
}

export async function deleteOrderById(orderId: string) {
  const db = getDb();
  await db.delete(ordersTable).where(eq(ordersTable.id, orderId));
}

export async function getOrderById(orderId: string) {
  const db = getDb();
  const rows = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  return rows[0] ?? null;
}

export async function getOrderSummaryForUser(input: { userId: string; orderId: string }) {
  const db = getDb();
  const orders = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, input.orderId), eq(ordersTable.userId, input.userId)))
    .limit(1);
  const order = orders[0] ?? null;
  if (!order) {
    return null;
  }

  const leadItems = await db
    .select()
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, order.id))
    .orderBy(desc(orderItemsTable.createdAt))
    .limit(1);

  return {
    order,
    leadItem: leadItems[0] ?? null,
  };
}

export async function getOrderByPaymentSessionId(paymentSessionId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.paymentSessionId, paymentSessionId))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateOrderPaymentState(input: {
  orderId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentReference?: string;
  note: string;
  actorType?: "system" | "customer" | "admin" | "provider";
  actorId?: string;
}) {
  const db = getDb();
  const updatedAt = nowDate();

  const order = await getOrderById(input.orderId);
  if (!order) {
    throw new Error(`Order ${input.orderId} not found`);
  }

  assertValidOrderStatusTransition(order.status as OrderStatus, input.status);
  assertValidPaymentStatusTransition(order.paymentStatus as PaymentStatus, input.paymentStatus);

  await db
    .update(ordersTable)
    .set({
      status: input.status,
      paymentStatus: input.paymentStatus,
      paymentReference: input.paymentReference,
      updatedAt,
    })
    .where(eq(ordersTable.id, input.orderId));

  await appendOrderStatusTimeline({
    orderId: input.orderId,
    status: input.status,
    actorType: input.actorType ?? "provider",
    ...(input.actorId ? { actorId: input.actorId } : {}),
    ...(input.note ? { note: input.note } : {}),
  });
}

export async function appendOrderStatusTimeline(input: {
  orderId: string;
  status: OrderStatus;
  actorType: "system" | "customer" | "admin" | "provider";
  actorId?: string;
  note?: string;
}) {
  const db = getDb();
  await db.insert(orderStatusTimelineTable).values({
    id: crypto.randomUUID(),
    orderId: input.orderId,
    status: input.status,
    actorType: input.actorType,
    actorId: input.actorId,
    note: input.note,
    createdAt: nowDate(),
  });
}

export async function listOrdersForUser(userId: string) {
  const db = getDb();
  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.userId, userId))
    .orderBy(desc(ordersTable.createdAt));

  const rows: Array<{
    order: typeof ordersTable.$inferSelect;
    leadItem: typeof orderItemsTable.$inferSelect | null;
  }> = [];
  for (const order of orders) {
    const items = await db
      .select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.orderId, order.id))
      .orderBy(desc(orderItemsTable.createdAt))
      .limit(1);
    rows.push({
      order,
      leadItem: items[0] ?? null,
    });
  }
  return rows;
}

export async function listOrdersForAdmin(limit = 50) {
  const db = getDb();
  const orders = await db
    .select()
    .from(ordersTable)
    .orderBy(desc(ordersTable.createdAt))
    .limit(limit);

  const rows: Array<{
    order: typeof ordersTable.$inferSelect;
    leadItem: typeof orderItemsTable.$inferSelect | null;
  }> = [];
  for (const order of orders) {
    const items = await db
      .select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.orderId, order.id))
      .orderBy(desc(orderItemsTable.createdAt))
      .limit(1);
    rows.push({
      order,
      leadItem: items[0] ?? null,
    });
  }

  return rows;
}
