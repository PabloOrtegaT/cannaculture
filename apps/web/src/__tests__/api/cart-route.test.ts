import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionUserMock, getUserCartMock, reconcileCartStateMock, replaceUserCartMock } = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  getUserCartMock: vi.fn(),
  reconcileCartStateMock: vi.fn(),
  replaceUserCartMock: vi.fn(),
}));

const { cartStateSafeParseMock, normalizeParsedCartStateMock } = vi.hoisted(() => ({
  cartStateSafeParseMock: vi.fn((payload: unknown) => {
    if (!payload || typeof payload !== "object" || !Array.isArray((payload as { items?: unknown }).items)) {
      return { success: false };
    }
    return { success: true, data: payload };
  }),
  normalizeParsedCartStateMock: vi.fn((value: unknown) => value),
}));

vi.mock("@/server/auth/session", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/server/cart/service", () => ({
  getUserCart: getUserCartMock,
  reconcileCartState: reconcileCartStateMock,
  replaceUserCart: replaceUserCartMock,
}));

vi.mock("@/server/cart/validation", () => ({
  cartStateSchema: {
    safeParse: cartStateSafeParseMock,
  },
  normalizeParsedCartState: normalizeParsedCartStateMock,
}));

import { GET, POST } from "@/app/api/cart/route";

describe("api/cart route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserCartMock.mockResolvedValue({ items: [] });
    reconcileCartStateMock.mockResolvedValue({
      cart: { items: [] },
      summary: { mergedLines: [], adjustedLines: [], unavailableLines: [], messages: [] },
    });
  });

  it("GET returns 401 when user is unauthenticated", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("GET returns persisted user cart", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    getUserCartMock.mockResolvedValue({
      items: [{ variantId: "variant-1", quantity: 2 }],
    });

    const response = await GET();

    expect(getUserCartMock).toHaveBeenCalledWith("user-1");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      cart: {
        items: [{ variantId: "variant-1", quantity: 2 }],
      },
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

  it("POST returns 400 for invalid payload", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    const request = new Request("http://localhost:3000/api/cart", {
      method: "POST",
      body: JSON.stringify({ bad: true }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid cart payload." });
    expect(reconcileCartStateMock).not.toHaveBeenCalled();
  });

  it("POST returns 400 when request body is not valid JSON", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    const request = new Request("http://localhost:3000/api/cart", {
      method: "POST",
      body: "{invalid-json",
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid cart payload." });
    expect(reconcileCartStateMock).not.toHaveBeenCalled();
  });

  it("POST reconciles cart and replaces persisted user cart", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    const reconciled = {
      cart: { items: [{ variantId: "variant-1", quantity: 3 }] },
      summary: {
        mergedLines: ["variant-1"],
        adjustedLines: [],
        unavailableLines: [],
        messages: [],
      },
    };
    reconcileCartStateMock.mockResolvedValue(reconciled);
    const request = new Request("http://localhost:3000/api/cart", {
      method: "POST",
      body: JSON.stringify({ items: [{ variantId: "variant-1", quantity: 3 }] }),
    });

    const response = await POST(request);

    expect(reconcileCartStateMock).toHaveBeenCalled();
    expect(replaceUserCartMock).toHaveBeenCalledWith("user-1", reconciled.cart);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(reconciled);
  });
});
