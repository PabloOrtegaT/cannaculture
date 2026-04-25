import { beforeEach, describe, expect, it, vi } from "vitest";

const mockParseWebhookEvent = vi.fn();
const mockProcessPaymentWebhookEvent = vi.fn();
const mockTrackWarn = vi.fn();
const mockTrackError = vi.fn();
const mockResolveProvider = vi.fn(() => ({
  parseWebhookEvent: mockParseWebhookEvent,
}));
const mockGetClientIp = vi.fn(() => "127.0.0.1");
const mockEnforceRateLimit = vi.fn(() => Promise.resolve({ allowed: true }));

vi.doMock("@/server/payments/provider", () => ({
  resolveProviderFromWebhookRoute: mockResolveProvider,
}));

vi.doMock("@/server/payments/webhook-service", () => ({
  processPaymentWebhookEvent: mockProcessPaymentWebhookEvent,
  MAX_WEBHOOK_PAYLOAD_BYTES: 16384,
  truncateWebhookPayload: vi.fn((p: string) => p),
}));

vi.doMock("@/server/observability/telemetry", () => ({
  trackWarn: mockTrackWarn,
  trackError: mockTrackError,
}));

vi.doMock("@/server/security/rate-limit", () => ({
  getClientIpFromRequest: mockGetClientIp,
  enforceRateLimit: mockEnforceRateLimit,
}));

describe("webhook payload size cap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceRateLimit.mockResolvedValue({ allowed: true });
  });

  describe("route handler", () => {
    it("returns 413 when Content-Length exceeds 16 KiB", async () => {
      const { POST } = await import("@/app/api/payments/webhook/[provider]/route");
      const request = new Request("http://localhost/api/payments/webhook/mock-card", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": "16385",
        },
        body: JSON.stringify({ test: "x" }),
      });
      const response = await POST(request, { params: Promise.resolve({ provider: "mock-card" }) });
      expect(response.status).toBe(413);
      expect(mockTrackWarn).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: "api.payments.webhook.post",
          message: "payload_too_large",
          metadata: expect.objectContaining({
            provider: "mock-card",
            contentLength: 16385,
            maxBytes: 16384,
          }),
        }),
      );
      expect(mockProcessPaymentWebhookEvent).not.toHaveBeenCalled();
    });

    it("allows payload at exactly 16 KiB", async () => {
      mockParseWebhookEvent.mockResolvedValue({
        providerId: "mock-card",
        eventId: "evt_123",
        eventType: "test",
        occurredAt: new Date(),
        outcome: "succeeded",
        payload: "x".repeat(16384),
      });
      mockProcessPaymentWebhookEvent.mockResolvedValue({
        kind: "processed",
        eventId: "evt_123",
        orderId: "order-123",
        outcome: "succeeded",
      });

      const { POST } = await import("@/app/api/payments/webhook/[provider]/route");
      const request = new Request("http://localhost/api/payments/webhook/mock-card", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": "16384",
        },
        body: "x".repeat(16384),
      });
      const response = await POST(request, { params: Promise.resolve({ provider: "mock-card" }) });
      expect(response.status).toBe(200);
      expect(mockProcessPaymentWebhookEvent).toHaveBeenCalled();
    });

    it("allows normal small payloads", async () => {
      mockParseWebhookEvent.mockResolvedValue({
        providerId: "mock-card",
        eventId: "evt_small",
        eventType: "test",
        occurredAt: new Date(),
        outcome: "succeeded",
        payload: "{}",
      });
      mockProcessPaymentWebhookEvent.mockResolvedValue({
        kind: "processed",
        eventId: "evt_small",
        orderId: "order-123",
        outcome: "succeeded",
      });

      const { POST } = await import("@/app/api/payments/webhook/[provider]/route");
      const request = new Request("http://localhost/api/payments/webhook/mock-card", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ eventId: "evt_small", outcome: "succeeded" }),
      });
      const response = await POST(request, { params: Promise.resolve({ provider: "mock-card" }) });
      expect(response.status).toBe(200);
      expect(mockTrackWarn).not.toHaveBeenCalledWith(
        expect.objectContaining({ message: "payload_too_large" }),
      );
      expect(mockProcessPaymentWebhookEvent).toHaveBeenCalled();
    });
  });

  describe("truncateWebhookPayload", () => {
    it("passes through payloads at exactly 16 KiB", async () => {
      const mod = await vi.importActual<typeof import("@/server/payments/webhook-service")>("@/server/payments/webhook-service");
      const payload = "a".repeat(16384);
      expect(mod.truncateWebhookPayload(payload)).toBe(payload);
    });

    it("passes through small payloads unchanged", async () => {
      const mod = await vi.importActual<typeof import("@/server/payments/webhook-service")>("@/server/payments/webhook-service");
      const payload = JSON.stringify({ eventId: "123", type: "test" });
      expect(mod.truncateWebhookPayload(payload)).toBe(payload);
    });

    it("truncates payloads exceeding 16 KiB and appends marker", async () => {
      const mod = await vi.importActual<typeof import("@/server/payments/webhook-service")>("@/server/payments/webhook-service");
      const payload = "b".repeat(20000);
      const result = mod.truncateWebhookPayload(payload);
      expect(result).toContain("...[TRUNCATED]");
      expect(result.length).toBeLessThanOrEqual(payload.length);
      const bytes = new TextEncoder().encode(result);
      expect(bytes.length).toBeLessThanOrEqual(mod.MAX_WEBHOOK_PAYLOAD_BYTES);
    });
  });
});
