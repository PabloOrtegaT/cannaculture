import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  resolveSurfaceFromRequestMock,
  readRefreshTokenForCurrentRequestMock,
  clearRefreshCookieMock,
  revokeRefreshSessionByTokenMock,
  normalizeHostMock,
} = vi.hoisted(() => ({
  resolveSurfaceFromRequestMock: vi.fn(() => "storefront"),
  readRefreshTokenForCurrentRequestMock: vi.fn(),
  clearRefreshCookieMock: vi.fn(),
  revokeRefreshSessionByTokenMock: vi.fn(),
  normalizeHostMock: vi.fn((value: string | null | undefined) => (value ?? "").replace(/:\d+$/, "")),
}));

vi.mock("@/server/auth/request-context", () => ({
  resolveSurfaceFromRequest: resolveSurfaceFromRequestMock,
}));

vi.mock("@/server/auth/refresh-cookie", () => ({
  readRefreshTokenForCurrentRequest: readRefreshTokenForCurrentRequestMock,
  clearRefreshCookie: clearRefreshCookieMock,
}));

vi.mock("@/server/auth/refresh-sessions", () => ({
  revokeRefreshSessionByToken: revokeRefreshSessionByTokenMock,
}));

vi.mock("@/server/config/host-policy", () => ({
  normalizeHost: normalizeHostMock,
}));

import { POST } from "@/app/api/auth/logout/route";

describe("api/auth/logout route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears cookie even when no refresh token is present", async () => {
    readRefreshTokenForCurrentRequestMock.mockResolvedValue(null);
    const request = new Request("http://localhost:3000/api/auth/logout", {
      method: "POST",
      headers: {
        host: "storefront.lvh.me:3000",
      },
    });

    const response = await POST(request);

    expect(revokeRefreshSessionByTokenMock).not.toHaveBeenCalled();
    expect(clearRefreshCookieMock).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("revokes refresh token and clears cookie", async () => {
    readRefreshTokenForCurrentRequestMock.mockResolvedValue("refresh-token");
    const request = new Request("http://localhost:3000/api/auth/logout", {
      method: "POST",
      headers: {
        host: "storefront.lvh.me:3000",
      },
    });

    const response = await POST(request);

    expect(revokeRefreshSessionByTokenMock).toHaveBeenCalledWith("refresh-token");
    expect(clearRefreshCookieMock).toHaveBeenCalled();
    expect(response.status).toBe(200);
  });
});
