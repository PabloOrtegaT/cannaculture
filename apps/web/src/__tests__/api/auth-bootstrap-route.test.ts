import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSessionUserMock,
  createRefreshSessionMock,
  rotateRefreshSessionByIdMock,
  resolveSurfaceFromRequestMock,
  getRequestClientContextMock,
  setRefreshCookieMock,
  normalizeHostMock,
} = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  createRefreshSessionMock: vi.fn(),
  rotateRefreshSessionByIdMock: vi.fn(),
  resolveSurfaceFromRequestMock: vi.fn(() => "storefront"),
  getRequestClientContextMock: vi.fn(() => ({ userAgent: "vitest" })),
  setRefreshCookieMock: vi.fn(),
  normalizeHostMock: vi.fn((value: string | null | undefined) => (value ?? "").replace(/:\d+$/, "")),
}));

vi.mock("@/server/auth/session", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/server/auth/refresh-sessions", () => ({
  createRefreshSession: createRefreshSessionMock,
  rotateRefreshSessionById: rotateRefreshSessionByIdMock,
}));

vi.mock("@/server/auth/request-context", () => ({
  resolveSurfaceFromRequest: resolveSurfaceFromRequestMock,
  getRequestClientContext: getRequestClientContextMock,
}));

vi.mock("@/server/auth/refresh-cookie", () => ({
  setRefreshCookie: setRefreshCookieMock,
}));

vi.mock("@/server/config/host-policy", () => ({
  normalizeHost: normalizeHostMock,
}));

import { POST } from "@/app/api/auth/bootstrap/route";

describe("api/auth/bootstrap route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createRefreshSessionMock.mockResolvedValue({
      rawToken: "raw-token-created",
      session: { id: "sid-created" },
    });
    rotateRefreshSessionByIdMock.mockResolvedValue({
      rawToken: "raw-token-rotated",
      session: { id: "sid-rotated" },
    });
  });

  it("returns 401 when user is not authenticated", async () => {
    getSessionUserMock.mockResolvedValue(null);
    const request = new Request("http://localhost:3000/api/auth/bootstrap", { method: "POST" });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(createRefreshSessionMock).not.toHaveBeenCalled();
    expect(rotateRefreshSessionByIdMock).not.toHaveBeenCalled();
  });

  it("rotates existing refresh session when sid is present", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "user-1",
      sid: "sid-old",
    });
    const request = new Request("http://localhost:3000/api/auth/bootstrap", {
      method: "POST",
      headers: {
        host: "storefront.lvh.me:3000",
      },
    });

    const response = await POST(request);

    expect(rotateRefreshSessionByIdMock).toHaveBeenCalledWith("sid-old", { userAgent: "vitest" });
    expect(createRefreshSessionMock).not.toHaveBeenCalled();
    expect(setRefreshCookieMock).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      sid: "sid-rotated",
      surface: "storefront",
    });
  });

  it("creates refresh session when sid rotation cannot be performed", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "user-2",
      sid: "sid-stale",
    });
    rotateRefreshSessionByIdMock.mockResolvedValue(null);
    const request = new Request("http://localhost:3000/api/auth/bootstrap", {
      method: "POST",
      headers: {
        host: "storefront.lvh.me:3000",
      },
    });

    const response = await POST(request);

    expect(rotateRefreshSessionByIdMock).toHaveBeenCalledWith("sid-stale", { userAgent: "vitest" });
    expect(createRefreshSessionMock).toHaveBeenCalledWith("user-2", "storefront", { userAgent: "vitest" });
    expect(setRefreshCookieMock).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      sid: "sid-created",
      surface: "storefront",
    });
  });
});
