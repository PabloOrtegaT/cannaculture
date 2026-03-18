import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  resolveSurfaceFromRequestMock,
  readRefreshTokenForCurrentRequestMock,
  setRefreshCookieMock,
  getRequestClientContextMock,
  rotateRefreshSessionByTokenMock,
  normalizeHostMock,
} = vi.hoisted(() => ({
  resolveSurfaceFromRequestMock: vi.fn(() => "storefront"),
  readRefreshTokenForCurrentRequestMock: vi.fn(),
  setRefreshCookieMock: vi.fn(),
  getRequestClientContextMock: vi.fn(() => ({ userAgent: "vitest" })),
  rotateRefreshSessionByTokenMock: vi.fn(),
  normalizeHostMock: vi.fn((value: string | null | undefined) => (value ?? "").replace(/:\d+$/, "")),
}));

vi.mock("@/server/auth/refresh-cookie", () => ({
  readRefreshTokenForCurrentRequest: readRefreshTokenForCurrentRequestMock,
  setRefreshCookie: setRefreshCookieMock,
}));

vi.mock("@/server/auth/request-context", () => ({
  resolveSurfaceFromRequest: resolveSurfaceFromRequestMock,
  getRequestClientContext: getRequestClientContextMock,
}));

vi.mock("@/server/auth/refresh-sessions", () => ({
  rotateRefreshSessionByToken: rotateRefreshSessionByTokenMock,
}));

vi.mock("@/server/config/host-policy", () => ({
  normalizeHost: normalizeHostMock,
}));

import { POST } from "@/app/api/auth/refresh/route";

describe("api/auth/refresh route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rotateRefreshSessionByTokenMock.mockResolvedValue({
      rawToken: "next-token",
      session: { id: "sid-next" },
    });
  });

  it("returns 401 when refresh token is missing", async () => {
    readRefreshTokenForCurrentRequestMock.mockResolvedValue(null);
    const request = new Request("http://localhost:3000/api/auth/refresh", { method: "POST" });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Missing refresh token." });
  });

  it("returns 401 when rotation fails", async () => {
    readRefreshTokenForCurrentRequestMock.mockResolvedValue("bad-token");
    rotateRefreshSessionByTokenMock.mockResolvedValue(null);
    const request = new Request("http://localhost:3000/api/auth/refresh", { method: "POST" });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Invalid or expired refresh session." });
  });

  it("rotates token and sets refreshed cookie", async () => {
    readRefreshTokenForCurrentRequestMock.mockResolvedValue("current-token");
    const request = new Request("http://localhost:3000/api/auth/refresh", {
      method: "POST",
      headers: { host: "storefront.lvh.me:3000" },
    });

    const response = await POST(request);

    expect(rotateRefreshSessionByTokenMock).toHaveBeenCalledWith("current-token", { userAgent: "vitest" });
    expect(setRefreshCookieMock).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      sid: "sid-next",
      surface: "storefront",
    });
  });
});
