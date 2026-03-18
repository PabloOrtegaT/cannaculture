import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionUserMock, revokeRefreshSessionByIdForUserMock } = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  revokeRefreshSessionByIdForUserMock: vi.fn(),
}));

vi.mock("@/server/auth/session", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/server/auth/refresh-sessions", () => ({
  revokeRefreshSessionByIdForUser: revokeRefreshSessionByIdForUserMock,
}));

import { DELETE } from "@/app/api/auth/sessions/[id]/route";

describe("api/auth/sessions/[id] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for anonymous users", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await DELETE(new Request("http://localhost:3000/api/auth/sessions/session-1"), {
      params: Promise.resolve({ id: "session-1" }),
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 404 when target session does not exist", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    revokeRefreshSessionByIdForUserMock.mockResolvedValue(false);

    const response = await DELETE(new Request("http://localhost:3000/api/auth/sessions/session-1"), {
      params: Promise.resolve({ id: "session-1" }),
    });

    expect(revokeRefreshSessionByIdForUserMock).toHaveBeenCalledWith("session-1", "user-1");
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Session not found." });
  });

  it("revokes session and returns ok", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    revokeRefreshSessionByIdForUserMock.mockResolvedValue(true);

    const response = await DELETE(new Request("http://localhost:3000/api/auth/sessions/session-2"), {
      params: Promise.resolve({ id: "session-2" }),
    });

    expect(revokeRefreshSessionByIdForUserMock).toHaveBeenCalledWith("session-2", "user-1");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});
