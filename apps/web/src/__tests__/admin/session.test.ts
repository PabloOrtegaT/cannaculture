import { beforeEach, describe, expect, it, vi } from "vitest";

const { assertAdminHostAccessMock, isAdminRoleMock, getSessionUserMock, requireSessionUserMock } = vi.hoisted(() => ({
  assertAdminHostAccessMock: vi.fn(),
  isAdminRoleMock: vi.fn((role: string) => role === "owner" || role === "manager"),
  getSessionUserMock: vi.fn(),
  requireSessionUserMock: vi.fn(),
}));

vi.mock("@/server/admin/role-guard", () => ({
  assertAdminHostAccess: assertAdminHostAccessMock,
  isAdminRole: isAdminRoleMock,
}));

vi.mock("@/server/auth/session", () => ({
  getSessionUser: getSessionUserMock,
  requireSessionUser: requireSessionUserMock,
}));

import { getAdminRole, requireAdminRole } from "@/server/admin/session";

describe("admin session helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertAdminHostAccessMock.mockResolvedValue(true);
  });

  it("returns null when no session user exists", async () => {
    getSessionUserMock.mockResolvedValue(null);
    await expect(getAdminRole()).resolves.toBeNull();
  });

  it("returns null for non-admin roles", async () => {
    getSessionUserMock.mockResolvedValue({ role: "catalog" });
    await expect(getAdminRole()).resolves.toBeNull();
  });

  it("returns admin role when user is owner/manager", async () => {
    getSessionUserMock.mockResolvedValue({ role: "owner" });
    await expect(getAdminRole()).resolves.toBe("owner");
  });

  it("requireAdminRole throws for non-admin users", async () => {
    requireSessionUserMock.mockResolvedValue({ role: "catalog" });
    await expect(requireAdminRole()).rejects.toThrow("Role catalog cannot access admin.");
  });

  it("requireAdminRole returns role when user is admin", async () => {
    requireSessionUserMock.mockResolvedValue({ role: "manager" });
    await expect(requireAdminRole()).resolves.toBe("manager");
  });
});
