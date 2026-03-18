import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSessionUserMock,
  getUserCartSnapshotMock,
  reconcileCartStateAgainstServerMock,
  replaceUserCartMock,
} = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  getUserCartSnapshotMock: vi.fn(),
  reconcileCartStateAgainstServerMock: vi.fn(),
  replaceUserCartMock: vi.fn(),
}));

const { cartWritePayloadSafeParseMock, normalizeCartWritePayloadMock } = vi.hoisted(() => ({
  cartWritePayloadSafeParseMock: vi.fn((payload: unknown) => {
    if (!payload || typeof payload !== "object" || !Array.isArray((payload as { items?: unknown }).items)) {
      return { success: false };
    }
    return { success: true, data: payload };
  }),
  normalizeCartWritePayloadMock: vi.fn((value: unknown): { cart: unknown; version?: number } => ({
    cart: value,
  })),
}));

const { enforceRateLimitMock, getClientIpFromRequestMock } = vi.hoisted(() => ({
  enforceRateLimitMock: vi.fn(() => ({ allowed: true, retryAfterSeconds: 0 })),
  getClientIpFromRequestMock: vi.fn(() => "127.0.0.1"),
}));

const { trackErrorMock, trackWarnMock } = vi.hoisted(() => ({
  trackErrorMock: vi.fn(),
  trackWarnMock: vi.fn(),
}));

vi.mock("@/server/auth/session", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/server/cart/service", () => ({
  getUserCartSnapshot: getUserCartSnapshotMock,
  reconcileCartStateAgainstServer: reconcileCartStateAgainstServerMock,
  replaceUserCart: replaceUserCartMock,
}));

vi.mock("@/server/cart/validation", () => ({
  cartWritePayloadSchema: {
    safeParse: cartWritePayloadSafeParseMock,
  },
  normalizeCartWritePayload: normalizeCartWritePayloadMock,
}));

vi.mock("@/server/security/rate-limit", () => ({
  enforceRateLimit: enforceRateLimitMock,
  getClientIpFromRequest: getClientIpFromRequestMock,
}));

vi.mock("@/server/observability/telemetry", () => ({
  trackError: trackErrorMock,
  trackWarn: trackWarnMock,
}));

import { GET, POST } from "@/app/api/cart/route";

describe("api/cart route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserCartSnapshotMock.mockResolvedValue({
      cart: { items: [] },
      version: 1,
    });
    reconcileCartStateAgainstServerMock.mockResolvedValue({
      cart: { items: [] },
      summary: { mergedLines: [], adjustedLines: [], unavailableLines: [], messages: [] },
    });
    replaceUserCartMock.mockResolvedValue({ ok: true, version: 2 });
  });

  it("GET returns 401 when user is unauthenticated", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("GET returns persisted user cart snapshot", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    getUserCartSnapshotMock.mockResolvedValue({
      cart: {
        items: [{ variantId: "variant-1", quantity: 2 }],
      },
      version: 7,
    });

    const response = await GET();

    expect(getUserCartSnapshotMock).toHaveBeenCalledWith("user-1");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      cart: {
        items: [{ variantId: "variant-1", quantity: 2 }],
      },
      version: 7,
    });
  });

  it("POST returns 401 when user is unauthenticated", async () => {
    getSessionUserMock.mockResolvedValue(null);
    const request = new Request("http://localhost:3000/api/cart", {
      method: "POST",
      body: JSON.stringify({ items: [] }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("POST returns 429 when rate limited", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    enforceRateLimitMock.mockReturnValueOnce({
      allowed: false,
      retryAfterSeconds: 8,
    });

    const request = new Request("http://localhost:3000/api/cart", {
      method: "POST",
      body: JSON.stringify({ items: [] }),
    });

    const response = await POST(request);

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("8");
    expect(await response.json()).toEqual({ error: "Too many cart updates. Please wait and try again." });
  });

  it("POST returns 400 for invalid payload", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    cartWritePayloadSafeParseMock.mockReturnValueOnce({ success: false });

    const request = new Request("http://localhost:3000/api/cart", {
      method: "POST",
      body: JSON.stringify({ bad: true }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid cart payload." });
    expect(reconcileCartStateAgainstServerMock).not.toHaveBeenCalled();
  });

  it("POST returns 409 when expected cart version is stale", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    normalizeCartWritePayloadMock.mockReturnValueOnce({
      cart: { items: [{ variantId: "variant-1", quantity: 3 }] },
      version: 1,
    });
    getUserCartSnapshotMock.mockResolvedValueOnce({
      cart: { items: [{ variantId: "variant-1", quantity: 2 }] },
      version: 9,
    });

    const request = new Request("http://localhost:3000/api/cart", {
      method: "POST",
      body: JSON.stringify({ items: [{ variantId: "variant-1", quantity: 3 }] }),
    });

    const response = await POST(request);

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Version conflict.",
      cart: { items: [{ variantId: "variant-1", quantity: 2 }] },
      version: 9,
      summary: { mergedLines: [], adjustedLines: [], unavailableLines: [], messages: [] },
    });
    expect(reconcileCartStateAgainstServerMock).not.toHaveBeenCalled();
  });

  it("POST reconciles cart against server snapshot and persists new version", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    normalizeCartWritePayloadMock.mockReturnValueOnce({
      cart: { items: [{ variantId: "variant-1", quantity: 3 }] },
      version: 5,
    });
    getUserCartSnapshotMock.mockResolvedValueOnce({
      cart: { items: [{ variantId: "variant-1", quantity: 1 }] },
      version: 5,
    });

    const reconciled = {
      cart: { items: [{ variantId: "variant-1", quantity: 3 }] },
      summary: {
        mergedLines: ["variant-1"],
        adjustedLines: [],
        unavailableLines: [],
        messages: ["Merged 1 item(s)."],
      },
    };
    reconcileCartStateAgainstServerMock.mockResolvedValueOnce(reconciled);
    replaceUserCartMock.mockResolvedValueOnce({ ok: true, version: 6 });

    const request = new Request("http://localhost:3000/api/cart", {
      method: "POST",
      body: JSON.stringify({ items: [{ variantId: "variant-1", quantity: 3 }] }),
    });

    const response = await POST(request);

    expect(reconcileCartStateAgainstServerMock).toHaveBeenCalledWith({
      requestedCart: { items: [{ variantId: "variant-1", quantity: 3 }] },
      serverCart: { items: [{ variantId: "variant-1", quantity: 1 }] },
    });
    expect(replaceUserCartMock).toHaveBeenCalledWith("user-1", reconciled.cart, {
      expectedVersion: 5,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      cart: reconciled.cart,
      summary: reconciled.summary,
      version: 6,
    });
  });
});
