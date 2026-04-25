import type { OrderStatus, PaymentStatus } from "./types";

export class InvalidOrderStateTransitionError extends Error {
  constructor(
    public readonly from: OrderStatus,
    public readonly to: OrderStatus,
  ) {
    super(`Invalid order status transition from "${from}" to "${to}"`);
    this.name = "InvalidOrderStateTransitionError";
  }
}

export class InvalidPaymentStatusTransitionError extends Error {
  constructor(
    public readonly from: PaymentStatus,
    public readonly to: PaymentStatus,
  ) {
    super(`Invalid payment status transition from "${from}" to "${to}"`);
    this.name = "InvalidPaymentStatusTransitionError";
  }
}

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_payment: ["paid", "cancelled", "payment_failed"],
  paid: ["shipped", "refunded", "cancelled"],
  shipped: ["delivered", "refunded"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
  payment_failed: ["cancelled"],
} as const;

export const PAYMENT_STATUS_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  pending: ["succeeded", "failed"],
  succeeded: ["refunded"],
  failed: ["pending"],
  refunded: [],
  cancelled: [],
} as const;

export function assertValidOrderStatusTransition(from: OrderStatus, to: OrderStatus): void {
  if (from === to) return;
  const allowed = ORDER_STATUS_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new InvalidOrderStateTransitionError(from, to);
  }
}

export function assertValidPaymentStatusTransition(from: PaymentStatus, to: PaymentStatus): void {
  if (from === to) return;
  const allowed = PAYMENT_STATUS_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new InvalidPaymentStatusTransitionError(from, to);
  }
}
