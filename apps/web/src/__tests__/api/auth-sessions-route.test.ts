import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionUserMock, listActiveRefreshSessionsForUserMock } = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  listActiveRefreshSessionsForUserMock: vi.fn(),
}));

vi.mock("@/server/auth/session", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/server/auth/refresh-sessions", () => ({
  listActiveRefreshSessionsForUser: listActiveRefreshSessionsForUserMock,
}));

import { GET } from "@/app/api/auth/sessions/route";

describe("api/auth/sessions route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for anonymous users", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns serialized active sessions for authenticated user", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    listActiveRefreshSessionsForUserMock.mockResolvedValue([
      {
        id: "session-1",
        surface: "storefront",
        deviceId: "device-1",
        userAgent: "agent",
        createdAt: new Date("2026-03-17T00:00:00.000Z"),
        lastSeenAt: new Date("2026-03-17T01:00:00.000Z"),
        idleExpiresAt: new Date("2026-04-17T01:00:00.000Z"),
        absoluteExpiresAt: new Date("2026-09-17T01:00:00.000Z"),
      },
    ]);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      sessions: [
        {
          id: "session-1",
          surface: "storefront",
          deviceId: "device-1",
          userAgent: "agent",
          createdAt: "2026-03-17T00:00:00.000Z",
          lastSeenAt: "2026-03-17T01:00:00.000Z",
          idleExpiresAt: "2026-04-17T01:00:00.000Z",
          absoluteExpiresAt: "2026-09-17T01:00:00.000Z",
        },
      ],
    });
  });
});
