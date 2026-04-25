import { describe, expect, it } from "vitest";
import {
  assertValidOrderStatusTransition,
  assertValidPaymentStatusTransition,
  InvalidOrderStateTransitionError,
  InvalidPaymentStatusTransitionError,
  ORDER_STATUS_TRANSITIONS,
  PAYMENT_STATUS_TRANSITIONS,
} from "@/server/orders/state-machine";

describe("ORDER_STATUS_TRANSITIONS", () => {
  it("allows pending_payment -> paid", () => {
    expect(ORDER_STATUS_TRANSITIONS.pending_payment).toContain("paid");
  });

  it("allows pending_payment -> cancelled", () => {
    expect(ORDER_STATUS_TRANSITIONS.pending_payment).toContain("cancelled");
  });

  it("allows paid -> shipped", () => {
    expect(ORDER_STATUS_TRANSITIONS.paid).toContain("shipped");
  });

  it("allows paid -> refunded", () => {
    expect(ORDER_STATUS_TRANSITIONS.paid).toContain("refunded");
  });

  it("allows paid -> cancelled", () => {
    expect(ORDER_STATUS_TRANSITIONS.paid).toContain("cancelled");
  });

  it("allows shipped -> delivered", () => {
    expect(ORDER_STATUS_TRANSITIONS.shipped).toContain("delivered");
  });

  it("allows shipped -> refunded", () => {
    expect(ORDER_STATUS_TRANSITIONS.shipped).toContain("refunded");
  });

  it("allows delivered -> refunded", () => {
    expect(ORDER_STATUS_TRANSITIONS.delivered).toContain("refunded");
  });

  it("has no transitions from cancelled", () => {
    expect(ORDER_STATUS_TRANSITIONS.cancelled).toHaveLength(0);
  });

  it("has no transitions from refunded", () => {
    expect(ORDER_STATUS_TRANSITIONS.refunded).toHaveLength(0);
  });
});

describe("PAYMENT_STATUS_TRANSITIONS", () => {
  it("allows pending -> succeeded", () => {
    expect(PAYMENT_STATUS_TRANSITIONS.pending).toContain("succeeded");
  });

  it("allows pending -> failed", () => {
    expect(PAYMENT_STATUS_TRANSITIONS.pending).toContain("failed");
  });

  it("allows succeeded -> refunded", () => {
    expect(PAYMENT_STATUS_TRANSITIONS.succeeded).toContain("refunded");
  });

  it("allows failed -> pending", () => {
    expect(PAYMENT_STATUS_TRANSITIONS.failed).toContain("pending");
  });

  it("has no transitions from refunded", () => {
    expect(PAYMENT_STATUS_TRANSITIONS.refunded).toHaveLength(0);
  });
});

describe("assertValidOrderStatusTransition", () => {
  it("does not throw for valid transitions", () => {
    expect(() =>
      assertValidOrderStatusTransition("pending_payment", "paid"),
    ).not.toThrow();
    expect(() => assertValidOrderStatusTransition("paid", "shipped")).not.toThrow();
    expect(() => assertValidOrderStatusTransition("shipped", "delivered")).not.toThrow();
    expect(() => assertValidOrderStatusTransition("delivered", "refunded")).not.toThrow();
  });

  it("does not throw when transitioning to the same status", () => {
    expect(() => assertValidOrderStatusTransition("paid", "paid")).not.toThrow();
  });

  it("throws for invalid transitions", () => {
    expect(() => assertValidOrderStatusTransition("cancelled", "paid")).toThrow(
      InvalidOrderStateTransitionError,
    );
    expect(() => assertValidOrderStatusTransition("refunded", "paid")).toThrow(
      InvalidOrderStateTransitionError,
    );
    expect(() => assertValidOrderStatusTransition("delivered", "shipped")).toThrow(
      InvalidOrderStateTransitionError,
    );
  });

  it("throws for transitions from terminal states", () => {
    expect(() =>
      assertValidOrderStatusTransition("cancelled", "pending_payment"),
    ).toThrow(InvalidOrderStateTransitionError);
    expect(() => assertValidOrderStatusTransition("refunded", "paid")).toThrow(
      InvalidOrderStateTransitionError,
    );
  });
});

describe("assertValidPaymentStatusTransition", () => {
  it("does not throw for valid transitions", () => {
    expect(() => assertValidPaymentStatusTransition("pending", "succeeded")).not.toThrow();
    expect(() => assertValidPaymentStatusTransition("pending", "failed")).not.toThrow();
    expect(() => assertValidPaymentStatusTransition("succeeded", "refunded")).not.toThrow();
    expect(() => assertValidPaymentStatusTransition("failed", "pending")).not.toThrow();
  });

  it("does not throw when transitioning to the same status", () => {
    expect(() => assertValidPaymentStatusTransition("pending", "pending")).not.toThrow();
  });

  it("throws for invalid transitions", () => {
    expect(() => assertValidPaymentStatusTransition("refunded", "pending")).toThrow(
      InvalidPaymentStatusTransitionError,
    );
    expect(() => assertValidPaymentStatusTransition("succeeded", "failed")).toThrow(
      InvalidPaymentStatusTransitionError,
    );
  });

  it("throws for transitions from terminal states", () => {
    expect(() => assertValidPaymentStatusTransition("refunded", "succeeded")).toThrow(
      InvalidPaymentStatusTransitionError,
    );
  });
});
