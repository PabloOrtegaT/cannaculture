import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionUserMock, isAdminRoleMock } = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  isAdminRoleMock: vi.fn(),
}));

vi.mock("@/server/auth/session", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/server/admin/role-guard", () => ({
  isAdminRole: isAdminRoleMock,
}));

import { GET } from "@/app/api/auth/viewer/route";

describe("api/auth/viewer route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAdminRoleMock.mockReturnValue(false);
  });

  it("returns unauthenticated payload when no session exists", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ authenticated: false });
  });

  it("returns authenticated payload with admin flag", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "user-1",
      email: "owner@example.com",
      role: "owner",
    });
    isAdminRoleMock.mockReturnValue(true);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      authenticated: true,
      email: "owner@example.com",
      role: "owner",
      isAdmin: true,
    });
  });
});
