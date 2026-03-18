import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionUserMock, mergeGuestCartIntoUserCartMock } = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  mergeGuestCartIntoUserCartMock: vi.fn(),
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
  mergeGuestCartIntoUserCart: mergeGuestCartIntoUserCartMock,
}));

vi.mock("@/server/cart/validation", () => ({
  cartStateSchema: {
    safeParse: cartStateSafeParseMock,
  },
  normalizeParsedCartState: normalizeParsedCartStateMock,
}));

import { POST } from "@/app/api/cart/merge/route";

describe("api/cart/merge route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mergeGuestCartIntoUserCartMock.mockResolvedValue({
      cart: { items: [] },
      summary: { mergedLines: [], adjustedLines: [], unavailableLines: [], messages: [] },
      version: 1,
    });
  });

  it("returns 401 when user is unauthenticated", async () => {
    getSessionUserMock.mockResolvedValue(null);
    const request = new Request("http://localhost:3000/api/cart/merge", {
      method: "POST",
      body: JSON.stringify({ items: [] }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 on invalid guest cart payload", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    const request = new Request("http://localhost:3000/api/cart/merge", {
      method: "POST",
      body: JSON.stringify({ bad: true }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid cart payload." });
    expect(mergeGuestCartIntoUserCartMock).not.toHaveBeenCalled();
  });

  it("returns 400 when request body is invalid JSON", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    const request = new Request("http://localhost:3000/api/cart/merge", {
      method: "POST",
      body: "{bad-json",
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid cart payload." });
    expect(mergeGuestCartIntoUserCartMock).not.toHaveBeenCalled();
  });

  it("merges guest cart into authenticated cart", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    const mergeResult = {
      cart: { items: [{ variantId: "variant-1", quantity: 1 }] },
      summary: { mergedLines: ["variant-1"], adjustedLines: [], unavailableLines: [], messages: [] },
      version: 2,
    };
    mergeGuestCartIntoUserCartMock.mockResolvedValue(mergeResult);

    const request = new Request("http://localhost:3000/api/cart/merge", {
      method: "POST",
      body: JSON.stringify({
        items: [{ variantId: "variant-1", quantity: 1 }],
      }),
    });

    const response = await POST(request);

    expect(mergeGuestCartIntoUserCartMock).toHaveBeenCalledWith("user-1", {
      items: [{ variantId: "variant-1", quantity: 1 }],
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(mergeResult);
  });
});
