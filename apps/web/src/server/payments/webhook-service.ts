import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import {
  inventoryHoldsTable,
  inventoryStocksTable,
  orderItemsTable,
  paymentAttemptsTable,
  paymentWebhookEventsTable,
} from "@/server/db/schema";
import {
  decrementInventoryForPaidOrder,
  releaseInventoryHoldsForOrder,
  restoreInventoryFromHolds,
} from "@/server/inventory/service";
import {
  getOrderById,
  getOrderByPaymentSessionId,
  updateOrderPaymentState,
} from "@/server/orders/service";
import type { PaymentWebhookEvent } from "@/server/orders/types";

type ProcessWebhookResult =
  | {
      kind: "duplicate";
      eventId: string;
    }
  | {
      kind: "processed";
      eventId: string;
      orderId: string | null;
      outcome: "succeeded" | "failed" | "cancelled" | "pending";
    };

function nowDate() {
  return new Date();
}

export function mapOrderStateFromWebhookOutcome(outcome: PaymentWebhookEvent["outcome"]) {
  if (outcome === "succeeded") {
    return {
      status: "paid" as const,
      paymentStatus: "succeeded" as const,
      note: "Payment confirmed by webhook.",
    };
  }
  if (outcome === "failed") {
    return {
      status: "payment_failed" as const,
      paymentStatus: "failed" as const,
      note: "Payment failed according to webhook event.",
    };
  }
  if (outcome === "cancelled") {
    return {
      status: "cancelled" as const,
      paymentStatus: "cancelled" as const,
      note: "Payment cancelled according to webhook event.",
    };
  }
  return {
    status: "pending_payment" as const,
    paymentStatus: "pending" as const,
    note: "Payment remains pending according to webhook event.",
  };
}

export async function processPaymentWebhookEvent(
  event: PaymentWebhookEvent,
): Promise<ProcessWebhookResult> {
  const db = getDb();
  const receivedAt = nowDate();

  const [inserted] = await db
    .insert(paymentWebhookEventsTable)
    .values({
      id: crypto.randomUUID(),
      provider: event.providerId,
      eventId: event.eventId,
      eventType: event.eventType,
      payload: event.payload,
      outcome: "received",
      receivedAt,
    })
    .onConflictDoNothing({
      target: [paymentWebhookEventsTable.provider, paymentWebhookEventsTable.eventId],
    })
    .returning({
      id: paymentWebhookEventsTable.id,
    });

  if (!inserted) {
    return {
      kind: "duplicate",
      eventId: event.eventId,
    };
  }

  const order =
    (event.orderId ? await getOrderById(event.orderId) : null) ??
    (event.providerSessionId ? await getOrderByPaymentSessionId(event.providerSessionId) : null);

  const processedAt = nowDate();

  if (order) {
    const mapped = mapOrderStateFromWebhookOutcome(event.outcome);
    const isAlreadyPaid = order.status === "paid" && order.paymentStatus === "succeeded";
    const shouldIgnoreDowngrade =
      isAlreadyPaid &&
      (event.outcome === "failed" || event.outcome === "cancelled" || event.outcome === "pending");

    if (shouldIgnoreDowngrade) {
      // Keep the paid order immutable for late/out-of-order webhooks.
    } else if (event.outcome === "succeeded") {
      // F4-5: verify holds still exist before marking paid.
      // If holds were swept, re-check stock availability.
      const holds = await db
        .select()
        .from(inventoryHoldsTable)
        .where(eq(inventoryHoldsTable.orderId, order.id));

      if (holds.length === 0) {
        // Holds expired/swept — verify we can still fulfill from current stock.
        const items = await db
          .select()
          .from(orderItemsTable)
          .where(eq(orderItemsTable.orderId, order.id));

        const stockRows = await db
          .select()
          .from(inventoryStocksTable)
          .where(inArray(inventoryStocksTable.variantId, items.map((i) => i.variantId)));

        const stockByVariant = new Map(stockRows.map((r) => [r.variantId, r.onHandQty]));
        const shortages = items.filter((item) => {
          const onHand = stockByVariant.get(item.variantId) ?? 0;
          return onHand < item.quantity;
        });

        if (shortages.length > 0) {
          // Stock was restored and someone else bought it. Reject payment.
          throw new Error(
            `Cannot fulfill order ${order.id}: stock no longer available after hold expiry`,
          );
        }

        // Stock is still available — decrement it now (holds are already gone).
        await decrementInventoryForPaidOrder(order.id);
      } else {
        // Holds still active — release them (stock already reserved at checkout).
        await releaseInventoryHoldsForOrder(order.id);
      }

      await updateOrderPaymentState({
        orderId: order.id,
        status: mapped.status,
        paymentStatus: mapped.paymentStatus,
        ...(event.paymentReference ? { paymentReference: event.paymentReference } : {}),
        note: mapped.note,
        actorType: "provider",
        actorId: event.providerId,
      });
    } else if (event.outcome === "failed" || event.outcome === "cancelled") {
      // F4-5: payment failed — restore held stock and delete holds.
      await restoreInventoryFromHolds(order.id);
      await updateOrderPaymentState({
        orderId: order.id,
        status: mapped.status,
        paymentStatus: mapped.paymentStatus,
        ...(event.paymentReference ? { paymentReference: event.paymentReference } : {}),
        note: mapped.note,
        actorType: "provider",
        actorId: event.providerId,
      });
    } else {
      await updateOrderPaymentState({
        orderId: order.id,
        status: mapped.status,
        paymentStatus: mapped.paymentStatus,
        ...(event.paymentReference ? { paymentReference: event.paymentReference } : {}),
        note: mapped.note,
        actorType: "provider",
        actorId: event.providerId,
      });
    }
  }

  if (event.providerSessionId) {
    await db
      .update(paymentAttemptsTable)
      .set({
        status: event.outcome,
        errorCode: event.outcome === "failed" ? event.eventType : null,
        updatedAt: processedAt,
      })
      .where(
        and(
          eq(paymentAttemptsTable.provider, event.providerId),
          eq(paymentAttemptsTable.providerSessionId, event.providerSessionId),
        ),
      );
  }

  await db
    .update(paymentWebhookEventsTable)
    .set({
      orderId: order?.id,
      outcome: order ? event.outcome : "ignored_no_order",
      processedAt,
    })
    .where(
      and(
        eq(paymentWebhookEventsTable.provider, event.providerId),
        eq(paymentWebhookEventsTable.eventId, event.eventId),
      ),
    );

  return {
    kind: "processed",
    eventId: event.eventId,
    orderId: order?.id ?? null,
    outcome: event.outcome,
  };
}
