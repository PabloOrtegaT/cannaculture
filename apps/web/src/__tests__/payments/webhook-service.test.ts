import { describe, expect, it } from "vitest";
import { mapOrderStateFromWebhookOutcome } from "@/server/payments/webhook-service";
import type { PaymentWebhookEvent } from "@/server/orders/types";

describe("mapOrderStateFromWebhookOutcome", () => {
  it("maps succeeded to paid / succeeded", () => {
    const result = mapOrderStateFromWebhookOutcome("succeeded");
    expect(result.status).toBe("paid");
    expect(result.paymentStatus).toBe("succeeded");
  });

  it("maps failed to payment_failed / failed", () => {
    const result = mapOrderStateFromWebhookOutcome("failed");
    expect(result.status).toBe("payment_failed");
    expect(result.paymentStatus).toBe("failed");
  });

  it("maps cancelled to cancelled / cancelled", () => {
    const result = mapOrderStateFromWebhookOutcome("cancelled");
    expect(result.status).toBe("cancelled");
    expect(result.paymentStatus).toBe("cancelled");
  });

  it("maps pending (and unknown) to pending_payment / pending", () => {
    const result = mapOrderStateFromWebhookOutcome("pending");
    expect(result.status).toBe("pending_payment");
    expect(result.paymentStatus).toBe("pending");
  });

  it("returns a note for every outcome", () => {
    const outcomes: PaymentWebhookEvent["outcome"][] = [
      "succeeded",
      "failed",
      "cancelled",
      "pending",
    ];
    for (const outcome of outcomes) {
      const result = mapOrderStateFromWebhookOutcome(outcome);
      expect(result.note).toBeTruthy();
      expect(typeof result.note).toBe("string");
    }
  });
});
