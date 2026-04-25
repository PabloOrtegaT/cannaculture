import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";

const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockSelect = vi.fn();
const mockDb = {
  insert: mockInsert,
  update: mockUpdate,
  select: mockSelect,
};

vi.doMock("@/server/db/client", () => ({
  getDb: vi.fn(() => mockDb),
}));

vi.doMock("@/server/db/schema", () => ({
  paymentWebhookEventsTable: {
    provider: "provider",
    eventId: "eventId",
    orderId: "orderId",
  },
  paymentAttemptsTable: {
    provider: "provider",
    providerSessionId: "providerSessionId",
    status: "status",
    errorCode: "errorCode",
    updatedAt: "updatedAt",
  },
  inventoryHoldsTable: {
    orderId: "orderId",
  },
  inventoryStocksTable: {
    variantId: "variantId",
    onHandQty: "onHandQty",
  },
  orderItemsTable: {
    orderId: "orderId",
    variantId: "variantId",
    quantity: "quantity",
  },
}));

vi.doMock("@/server/orders/service", () => ({
  getOrderById: vi.fn(() => Promise.resolve(null)),
  getOrderByPaymentSessionId: vi.fn(() => Promise.resolve(null)),
  updateOrderPaymentState: vi.fn(() => Promise.resolve()),
}));

vi.doMock("@/server/inventory/service", () => ({
  decrementInventoryForPaidOrder: vi.fn(() => Promise.resolve()),
  releaseInventoryHoldsForOrder: vi.fn(() => Promise.resolve()),
  restoreInventoryFromHolds: vi.fn(() => Promise.resolve()),
}));

const testStripeSecret = "whsec_test_stripe_secret";
const testMpSecret = "test_mp_secret";
const testMockSecret = "test_mock_secret";

vi.doMock("@/server/config/runtime-env", () => ({
  getPaymentRuntimeConfig: vi.fn(() => ({
    stripeSecretKey: "sk_test_xxx",
    stripeWebhookSecret: testStripeSecret,
    mercadoPagoAccessToken: "test_mp_token",
    mercadoPagoWebhookSecret: testMpSecret,
    mockWebhookSecret: testMockSecret,
  })),
  getHostRuntimeConfig: vi.fn(() => ({
    appBaseUrl: "http://localhost:3000",
    adminBaseUrl: "http://admin.localhost:3000",
    adminRequireCfAccess: false,
  })),
}));

describe("payment webhook provider dispatcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Stripe parseWebhookEvent", () => {
    it("accepts a valid signature", async () => {
      const { resolveProviderFromWebhookRoute } = await import(
        "@/server/payments/provider"
      );
      const provider = resolveProviderFromWebhookRoute("stripe");
      const payload = JSON.stringify({
        id: "evt_123",
        type: "checkout.session.completed",
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: "cs_123",
            client_reference_id: "order-123",
            payment_intent: "pi_123",
          },
        },
      });
      const now = Math.floor(Date.now() / 1000);
      const signedPayload = `${now}.${payload}`;
      const signature = createHmac("sha256", testStripeSecret)
        .update(signedPayload)
        .digest("hex");
      const request = new Request("http://localhost/webhook", {
        method: "POST",
        headers: { "stripe-signature": `t=${now},v1=${signature}` },
        body: payload,
      });

      const event = await provider.parseWebhookEvent(request);
      expect(event.providerId).toBe("stripe");
      expect(event.eventId).toBe("evt_123");
      expect(event.outcome).toBe("succeeded");
    });

    it("rejects an invalid signature", async () => {
      const { resolveProviderFromWebhookRoute } = await import(
        "@/server/payments/provider"
      );
      const provider = resolveProviderFromWebhookRoute("stripe");
      const payload = JSON.stringify({ id: "evt_123", type: "checkout.session.completed" });
      const request = new Request("http://localhost/webhook", {
        method: "POST",
        headers: { "stripe-signature": "t=123,v1=bad_signature" },
        body: payload,
      });

      await expect(provider.parseWebhookEvent(request)).rejects.toThrow(
        "Invalid Stripe webhook signature."
      );
    });

    it("rejects a replay with an old timestamp", async () => {
      const { resolveProviderFromWebhookRoute } = await import(
        "@/server/payments/provider"
      );
      const provider = resolveProviderFromWebhookRoute("stripe");
      const payload = JSON.stringify({ id: "evt_123", type: "checkout.session.completed" });
      const oldTs = Math.floor(Date.now() / 1000) - 6 * 60; // 6 minutes ago
      const signedPayload = `${oldTs}.${payload}`;
      const signature = createHmac("sha256", testStripeSecret)
        .update(signedPayload)
        .digest("hex");
      const request = new Request("http://localhost/webhook", {
        method: "POST",
        headers: { "stripe-signature": `t=${oldTs},v1=${signature}` },
        body: payload,
      });

      await expect(provider.parseWebhookEvent(request)).rejects.toThrow(
        "Invalid Stripe webhook signature."
      );
    });

    it("rejects an event missing a provider-issued id", async () => {
      const { resolveProviderFromWebhookRoute } = await import(
        "@/server/payments/provider"
      );
      const provider = resolveProviderFromWebhookRoute("stripe");
      const payload = JSON.stringify({
        type: "checkout.session.completed",
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: "cs_123",
            client_reference_id: "order-123",
            payment_intent: "pi_123",
          },
        },
      });
      const now = Math.floor(Date.now() / 1000);
      const signedPayload = `${now}.${payload}`;
      const signature = createHmac("sha256", testStripeSecret)
        .update(signedPayload)
        .digest("hex");
      const request = new Request("http://localhost/webhook", {
        method: "POST",
        headers: { "stripe-signature": `t=${now},v1=${signature}` },
        body: payload,
      });

      await expect(provider.parseWebhookEvent(request)).rejects.toThrow(
        "Stripe webhook event missing provider-issued id."
      );
    });
  });

  describe("Mercado Pago parseWebhookEvent", () => {
    function hmacSha256Hex(secret: string, message: string): string {
      return createHmac("sha256", secret).update(message).digest("hex");
    }

    it("accepts a valid HMAC signature", async () => {
      const { resolveProviderFromWebhookRoute } = await import(
        "@/server/payments/provider"
      );
      const provider = resolveProviderFromWebhookRoute("mercadopago");
      const ts = Math.floor(Date.now() / 1000);
      const dataId = "12345";
      const requestId = "req-abc";
      const payload = JSON.stringify({
        id: "mp_123",
        type: "payment.approved",
        date_created: new Date().toISOString(),
        data: { id: dataId, metadata: { orderId: "order-123" } },
      });
      const manifest = `id:${dataId};request-id:${requestId}`;
      const signature = hmacSha256Hex(testMpSecret, manifest);
      const request = new Request("http://localhost/webhook", {
        method: "POST",
        headers: {
          "x-mercadopago-signature": `ts=${ts},v1=${signature}`,
          "x-request-id": requestId,
        },
        body: payload,
      });

      const event = await provider.parseWebhookEvent(request);
      expect(event.providerId).toBe("mercadopago");
      expect(event.eventId).toBe("mp_123");
      expect(event.outcome).toBe("succeeded");
    });

    it("rejects an invalid HMAC signature", async () => {
      const { resolveProviderFromWebhookRoute } = await import(
        "@/server/payments/provider"
      );
      const provider = resolveProviderFromWebhookRoute("mercadopago");
      const payload = JSON.stringify({ id: "mp_123", type: "payment.approved" });
      const request = new Request("http://localhost/webhook", {
        method: "POST",
        headers: {
          "x-mercadopago-signature": "ts=123,v1=bad_signature",
          "x-request-id": "req-abc",
        },
        body: payload,
      });

      await expect(provider.parseWebhookEvent(request)).rejects.toThrow(
        "Invalid Mercado Pago webhook signature."
      );
    });

    it("rejects a replay with an old timestamp", async () => {
      const { resolveProviderFromWebhookRoute } = await import(
        "@/server/payments/provider"
      );
      const provider = resolveProviderFromWebhookRoute("mercadopago");
      const ts = Math.floor(Date.now() / 1000) - 6 * 60; // 6 minutes ago
      const dataId = "12345";
      const requestId = "req-abc";
      const payload = JSON.stringify({
        id: "mp_123",
        type: "payment.approved",
        data: { id: dataId },
      });
      const manifest = `id:${dataId};request-id:${requestId}`;
      const signature = hmacSha256Hex(testMpSecret, manifest);
      const request = new Request("http://localhost/webhook", {
        method: "POST",
        headers: {
          "x-mercadopago-signature": `ts=${ts},v1=${signature}`,
          "x-request-id": requestId,
        },
        body: payload,
      });

      await expect(provider.parseWebhookEvent(request)).rejects.toThrow(
        "Mercado Pago signature timestamp out of tolerance."
      );
    });

    it("rejects a missing signature", async () => {
      const { resolveProviderFromWebhookRoute } = await import(
        "@/server/payments/provider"
      );
      const provider = resolveProviderFromWebhookRoute("mercadopago");
      const payload = JSON.stringify({ id: "mp_123", type: "payment.approved" });
      const request = new Request("http://localhost/webhook", {
        method: "POST",
        headers: {},
        body: payload,
      });

      await expect(provider.parseWebhookEvent(request)).rejects.toThrow(
        "Mercado Pago webhook secret or signature missing."
      );
    });

    it("rejects an event missing a provider-issued id", async () => {
      const { resolveProviderFromWebhookRoute } = await import(
        "@/server/payments/provider"
      );
      const provider = resolveProviderFromWebhookRoute("mercadopago");
      const ts = Math.floor(Date.now() / 1000);
      const dataId = "12345";
      const requestId = "req-abc";
      const payload = JSON.stringify({
        type: "payment.approved",
        date_created: new Date().toISOString(),
        data: { id: dataId, metadata: { orderId: "order-123" } },
      });
      const manifest = `id:${dataId};request-id:${requestId}`;
      const signature = hmacSha256Hex(testMpSecret, manifest);
      const request = new Request("http://localhost/webhook", {
        method: "POST",
        headers: {
          "x-mercadopago-signature": `ts=${ts},v1=${signature}`,
          "x-request-id": requestId,
        },
        body: payload,
      });

      await expect(provider.parseWebhookEvent(request)).rejects.toThrow(
        "Mercado Pago webhook event missing provider-issued id."
      );
    });
  });

  describe("Mock webhook parseWebhookEvent", () => {
    it("accepts a valid signature", async () => {
      const { resolveProviderFromWebhookRoute } = await import(
        "@/server/payments/provider"
      );
      const provider = resolveProviderFromWebhookRoute("mock-card");
      const payload = JSON.stringify({
        eventId: "mock_123",
        eventType: "checkout.completed",
        outcome: "succeeded",
        orderId: "order-123",
      });
      const request = new Request("http://localhost/webhook", {
        method: "POST",
        headers: { "x-mock-webhook-signature": testMockSecret },
        body: payload,
      });

      const event = await provider.parseWebhookEvent(request);
      expect(event.providerId).toBe("mock-card");
      expect(event.eventId).toBe("mock_123");
      expect(event.outcome).toBe("succeeded");
    });

    it("rejects an invalid signature", async () => {
      const { resolveProviderFromWebhookRoute } = await import(
        "@/server/payments/provider"
      );
      const provider = resolveProviderFromWebhookRoute("mock-card");
      const payload = JSON.stringify({
        eventId: "mock_123",
        eventType: "checkout.completed",
        outcome: "succeeded",
      });
      const request = new Request("http://localhost/webhook", {
        method: "POST",
        headers: { "x-mock-webhook-signature": "wrong-secret" },
        body: payload,
      });

      await expect(provider.parseWebhookEvent(request)).rejects.toThrow(
        "Invalid mock webhook signature."
      );
    });

    it("rejects a payload missing eventId", async () => {
      const { resolveProviderFromWebhookRoute } = await import(
        "@/server/payments/provider"
      );
      const provider = resolveProviderFromWebhookRoute("mock-card");
      const payload = JSON.stringify({
        eventType: "checkout.completed",
        outcome: "succeeded",
      });
      const request = new Request("http://localhost/webhook", {
        method: "POST",
        headers: { "x-mock-webhook-signature": testMockSecret },
        body: payload,
      });

      await expect(provider.parseWebhookEvent(request)).rejects.toThrow();
    });
  });

  describe("processPaymentWebhookEvent idempotency", () => {
    it("returns duplicate when the same event is processed twice", async () => {
      const { processPaymentWebhookEvent } = await import(
        "@/server/payments/webhook-service"
      );
      const event = {
        providerId: "stripe" as const,
        eventId: "evt_dup_123",
        eventType: "checkout.session.completed",
        occurredAt: new Date(),
        outcome: "succeeded" as const,
        payload: "{}",
      };

      // First call: insert succeeds
      mockInsert.mockReturnValueOnce({
        values: vi.fn(() => ({
          onConflictDoNothing: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve([{ id: "row-1" }])),
          })),
        })),
      });
      mockSelect.mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([])),
        })),
      });
      mockUpdate.mockReturnValue({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve()),
        })),
      });

      const result1 = await processPaymentWebhookEvent(event);
      expect(result1.kind).toBe("processed");

      // Second call: insert conflict (no rows returned)
      mockInsert.mockReturnValueOnce({
        values: vi.fn(() => ({
          onConflictDoNothing: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve([])),
          })),
        })),
      });

      const result2 = await processPaymentWebhookEvent(event);
      expect(result2.kind).toBe("duplicate");
      expect(result2.eventId).toBe("evt_dup_123");
    });
  });
});
