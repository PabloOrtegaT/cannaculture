import { and, desc, eq } from "drizzle-orm";
import type { CartState } from "@/features/cart/cart";
import { getDb } from "@/server/db/client";
import {
  orderItemsTable,
  ordersTable,
  orderStatusTimelineTable,
  paymentAttemptsTable,
} from "@/server/db/schema";
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
  id?: string;
  orderNumber?: string;
}) {
  const db = getDb();
  const createdAt = nowDate();
  const orderNumber = input.orderNumber ?? createOrderNumber();
  const orderId = input.id ?? crypto.randomUUID();

  const [order] = await db
    .insert(ordersTable)
    .values({
      id: orderId,
      userId: input.userId,
      orderNumber,
      status: "pending_payment",
      paymentStatus: "pending",
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
    })
    .returning();

  if (!order) {
    throw new Error("Could not create checkout order.");
  }

  for (const line of input.cart.items) {
    await db.insert(orderItemsTable).values({
      id: crypto.randomUUID(),
      orderId: order.id,
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
    });
  }

  await appendOrderStatusTimeline({
    orderId: order.id,
    status: "pending_payment",
    actorType: "customer",
    actorId: input.userId,
    note: "Checkout session initialized.",
  });

  return order;
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
