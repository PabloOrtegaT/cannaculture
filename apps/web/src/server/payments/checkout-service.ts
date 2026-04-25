import {
  calculateCouponDiscountCents,
  isCouponApplicable,
  type Coupon,
} from "@cannaculture/domain";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { calculateCartTotals, getUnavailableCartItems, type CartState } from "@/features/cart/cart";
import { getHostRuntimeConfig } from "@/server/config/runtime-env";
import { getProfileRuntimeStore } from "@/server/data/runtime-store";
import { getUserCartSnapshot } from "@/server/cart/service";
import { getDb } from "@/server/db/client";
import { couponRedemptionsTable } from "@/server/db/schema";
import { validateInventoryForOrder, type StockConflictLine } from "@/server/inventory/service";
import {
  appendOrderStatusTimeline,
  attachCheckoutPaymentSession,
  createPendingCheckoutOrder,
  updateOrderPaymentState,
} from "@/server/orders/service";
import {
  checkoutProviderSchema,
  type CheckoutProvider,
  type OrderCouponSnapshot,
} from "@/server/orders/types";
import { resolvePaymentProvider } from "./provider";

const checkoutRequestSchema = z.object({
  provider: checkoutProviderSchema.default("card"),
  couponCode: z.string().trim().min(3).max(32).optional(),
  successPath: z.string().trim().startsWith("/").optional(),
  cancelPath: z.string().trim().startsWith("/").optional(),
});

type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

export class CheckoutStockConflictError extends Error {
  readonly code = "insufficient_stock";
  readonly lines: StockConflictLine[];

  constructor(lines: StockConflictLine[]) {
    super("Cart no longer has enough stock.");
    this.lines = lines;
  }
}

export class CheckoutCouponError extends Error {
  readonly code = "invalid_coupon";

  constructor(message = "Coupon code is invalid or not applicable.") {
    super(message);
  }
}

function normalizeCouponCode(rawCouponCode?: string) {
  const value = rawCouponCode?.trim().toUpperCase();
  if (!value) {
    return undefined;
  }
  return value;
}

function resolveCouponForCheckout(
  couponCode: string | undefined,
  currency: "MXN" | "USD",
): Coupon | null {
  if (!couponCode) {
    return null;
  }
  const store = getProfileRuntimeStore();
  const coupon =
    store.coupons.find((entry) => entry.code.toUpperCase() === couponCode.toUpperCase()) ?? null;
  if (!coupon) {
    return null;
  }
  if (!isCouponApplicable(coupon)) {
    return null;
  }
  if (coupon.type === "fixed" && coupon.currency && coupon.currency !== currency) {
    return null;
  }
  return coupon;
}

function toCouponSnapshot(coupon: Coupon): OrderCouponSnapshot {
  return {
    id: coupon.id,
    code: coupon.code,
    type: coupon.type,
    target: coupon.target,
    ...(typeof coupon.percentageOff === "number" ? { percentageOff: coupon.percentageOff } : {}),
    ...(typeof coupon.amountOffCents === "number" ? { amountOffCents: coupon.amountOffCents } : {}),
    ...(coupon.currency ? { currency: coupon.currency } : {}),
  };
}

export async function assertCouponRedemptionAllowed(coupon: Coupon, userId: string, orderId: string) {
  const db = getDb();

  const existingForOrder = await db
    .select()
    .from(couponRedemptionsTable)
    .where(
      and(
        eq(couponRedemptionsTable.couponId, coupon.id),
        eq(couponRedemptionsTable.orderId, orderId),
      ),
    )
    .limit(1);

  if (existingForOrder.length > 0) {
    throw new CheckoutCouponError("This coupon has already been applied to this order.");
  }

  if (typeof coupon.usageLimit === "number") {
    const globalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(couponRedemptionsTable)
      .where(eq(couponRedemptionsTable.couponId, coupon.id));

    const globalCount = globalResult[0]?.count ?? 0;
    if (globalCount >= coupon.usageLimit) {
      throw new CheckoutCouponError("This coupon has reached its maximum number of uses.");
    }
  }

  if (typeof coupon.perUserLimit === "number") {
    const userResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(couponRedemptionsTable)
      .where(
        and(eq(couponRedemptionsTable.couponId, coupon.id), eq(couponRedemptionsTable.userId, userId)),
      );

    const userCount = userResult[0]?.count ?? 0;
    if (userCount >= coupon.perUserLimit) {
      throw new CheckoutCouponError("You have already used this coupon the maximum number of times.");
    }
  }
}

function assertCartReadyForCheckout(cart: CartState) {
  if (cart.items.length === 0) {
    throw new Error("Cart is empty.");
  }

  const unavailableItems = getUnavailableCartItems(cart);
  if (unavailableItems.length > 0) {
    throw new Error("Cart contains unavailable items.");
  }
}

function resolveTotalsForCheckout(cart: CartState, couponCode?: string) {
  assertCartReadyForCheckout(cart);
  const baseTotals = calculateCartTotals(cart);
  if (baseTotals.itemCount <= 0 || baseTotals.subtotalCents <= 0) {
    throw new Error("Cart has no purchasable items.");
  }
  const currency = cart.items[0]?.currency ?? "MXN";
  const coupon = resolveCouponForCheckout(couponCode, currency);
  if (couponCode && !coupon) {
    throw new CheckoutCouponError();
  }
  const discountCents = coupon ? calculateCouponDiscountCents(coupon, baseTotals.subtotalCents) : 0;
  const shippingCents = 0;
  const totalCents = Math.max(0, baseTotals.subtotalCents - discountCents + shippingCents);

  return {
    totals: {
      subtotalCents: baseTotals.subtotalCents,
      discountCents,
      shippingCents,
      totalCents,
      itemCount: baseTotals.itemCount,
      currency,
    } as const,
    coupon: coupon ?? undefined,
  };
}

function buildCheckoutPath(pathname: string, orderId: string) {
  const search = new URLSearchParams();
  search.set("order", orderId);
  return `${pathname}?${search.toString()}`;
}

function buildAbsoluteUrl(pathname: string) {
  const host = getHostRuntimeConfig();
  return new URL(pathname, host.appBaseUrl).toString();
}

function createOrderNumber() {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = crypto.randomUUID().split("-")[0]?.toUpperCase() ?? "000000";
  return `ORD-${day}-${suffix}`;
}

export function parseCheckoutRequest(payload: unknown): CheckoutRequest {
  return checkoutRequestSchema.parse(payload);
}

export async function createCheckoutSessionForUser(input: {
  userId: string;
  customerEmail: string;
  provider: CheckoutProvider;
  couponCode?: string;
  successPath?: string;
  cancelPath?: string;
}) {
  const normalizedCouponCode = normalizeCouponCode(input.couponCode);
  const cartSnapshot = await getUserCartSnapshot(input.userId);
  const { totals, coupon } = resolveTotalsForCheckout(cartSnapshot.cart, normalizedCouponCode);
  const stockValidation = await validateInventoryForOrder({
    lines: cartSnapshot.cart.items.map((line) => ({
      variantId: line.variantId,
      quantity: line.quantity,
    })),
  });
  if (!stockValidation.ok) {
    throw new CheckoutStockConflictError(stockValidation.lines);
  }

  const orderId = crypto.randomUUID();
  const orderNumber = createOrderNumber();

  if (coupon) {
    await assertCouponRedemptionAllowed(coupon, input.userId, orderId);
  }

  let orderCreated = false;

  try {
    await createPendingCheckoutOrder({
      id: orderId,
      orderNumber,
      userId: input.userId,
      cart: cartSnapshot.cart,
      totals,
      ...(coupon
        ? {
            couponCode: coupon.code,
            couponSnapshot: toCouponSnapshot(coupon),
            couponRedemption: { couponId: coupon.id, orderId, userId: input.userId },
          }
        : {}),
      holdLines: cartSnapshot.cart.items.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
      })),
    });
    orderCreated = true;

    const provider = resolvePaymentProvider(input.provider);
    const successUrl = buildAbsoluteUrl(
      buildCheckoutPath(input.successPath ?? "/checkout/success", orderId),
    );
    const cancelUrl = buildAbsoluteUrl(
      buildCheckoutPath(input.cancelPath ?? "/checkout/cancel", orderId),
    );

    const paymentSession = await provider.createCheckoutSession({
      orderId: orderId,
      orderNumber,
      totals,
      successUrl,
      cancelUrl,
      customerEmail: input.customerEmail,
    });

    await attachCheckoutPaymentSession({
      orderId: orderId,
      paymentSession,
      amountCents: totals.totalCents,
      currency: totals.currency,
    });

    await appendOrderStatusTimeline({
      orderId: orderId,
      status: "pending_payment",
      actorType: "system",
      note: `Checkout session created with ${paymentSession.providerId}.`,
    });

    return {
      orderId: orderId,
      orderNumber,
      providerId: paymentSession.providerId,
      providerDisplayName: provider.displayName,
      paymentSessionId: paymentSession.sessionId,
      checkoutUrl: paymentSession.checkoutUrl,
      totals,
      coupon: coupon ? toCouponSnapshot(coupon) : null,
    };
  } catch (error) {
    if (orderCreated) {
      await updateOrderPaymentState({
        orderId,
        status: "payment_failed",
        paymentStatus: "failed",
        note: "Checkout provider session failed.",
        actorType: "system",
      }).catch(() => undefined);
    }

    throw error;
  }
}
