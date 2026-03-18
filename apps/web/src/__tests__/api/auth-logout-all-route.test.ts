import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionUserMock, clearAllRefreshCookiesMock, revokeAllRefreshSessionsForUserMock, normalizeHostMock } =
  vi.hoisted(() => ({
    getSessionUserMock: vi.fn(),
    clearAllRefreshCookiesMock: vi.fn(),
    revokeAllRefreshSessionsForUserMock: vi.fn(),
    normalizeHostMock: vi.fn((value: string | null | undefined) => (value ?? "").replace(/:\d+$/, "")),
  }));

vi.mock("@/server/auth/session", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/server/auth/refresh-cookie", () => ({
  clearAllRefreshCookies: clearAllRefreshCookiesMock,
}));

vi.mock("@/server/auth/refresh-sessions", () => ({
  revokeAllRefreshSessionsForUser: revokeAllRefreshSessionsForUserMock,
}));

vi.mock("@/server/config/host-policy", () => ({
  normalizeHost: normalizeHostMock,
}));

import { POST } from "@/app/api/auth/logout-all/route";

describe("api/auth/logout-all route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for anonymous users", async () => {
    getSessionUserMock.mockResolvedValue(null);
    const request = new Request("http://localhost:3000/api/auth/logout-all", { method: "POST" });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(revokeAllRefreshSessionsForUserMock).not.toHaveBeenCalled();
  });

  it("revokes all sessions and clears all refresh cookies", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    const request = new Request("http://localhost:3000/api/auth/logout-all", {
      method: "POST",
      headers: { host: "admin.lvh.me:3000" },
    });

    const response = await POST(request);

    expect(revokeAllRefreshSessionsForUserMock).toHaveBeenCalledWith("user-1");
    expect(clearAllRefreshCookiesMock).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});
