import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  return {
    headersMock: vi.fn(),
    getHostRuntimeConfigMock: vi.fn(),
    getAuthRuntimeConfigMock: vi.fn(),
    getSessionUserMock: vi.fn(),
    isRecentAuthenticationMock: vi.fn(),
  };
});

vi.mock("next/headers", () => ({
  headers: mocks.headersMock,
}));

vi.mock("@/server/config/runtime-env", () => ({
  getHostRuntimeConfig: mocks.getHostRuntimeConfigMock,
  getAuthRuntimeConfig: mocks.getAuthRuntimeConfigMock,
}));

vi.mock("@/server/auth/session", () => ({
  getSessionUser: mocks.getSessionUserMock,
}));

vi.mock("@/server/auth/refresh-session-policy", () => ({
  isRecentAuthentication: mocks.isRecentAuthenticationMock,
}));

import {
  assertAdminHostAccess,
  assertAdminMutationOrigin,
  ensurePermission,
  getRouteAccess,
} from "@/server/admin/role-guard";

function mockHeaders(values: Record<string, string | null | undefined>) {
  mocks.headersMock.mockResolvedValue({
    get(key: string) {
      const normalized = key.toLowerCase();
      const value = values[normalized];
      return value ?? null;
    },
  });
}

describe("admin runtime guard paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getHostRuntimeConfigMock.mockReturnValue({
      appBaseUrl: "https://spookynexus.com",
      adminBaseUrl: "https://admin.spookynexus.com",
      adminRequireCfAccess: false,
    });
    mocks.getAuthRuntimeConfigMock.mockReturnValue({
      adminRefreshIdleHours: 8,
    });
    mocks.isRecentAuthenticationMock.mockReturnValue(true);
    mocks.getSessionUserMock.mockResolvedValue({
      id: "user_owner",
      email: "owner@base-ecommerce.local",
      role: "owner",
      emailVerified: true,
      authenticatedAt: "2026-03-17T12:00:00.000Z",
    });
    mockHeaders({
      host: "admin.spookynexus.com",
      origin: "https://admin.spookynexus.com/admin/products",
      referer: "https://admin.spookynexus.com/admin/products",
    });
  });

  it("allows admin host access when request host matches admin host", async () => {
    await expect(assertAdminHostAccess()).resolves.toBe(true);
  });

  it("blocks admin host access when request host does not match admin host", async () => {
    mockHeaders({
      host: "spookynexus.com",
    });
    await expect(assertAdminHostAccess()).rejects.toMatchObject({ code: "forbidden" });
  });

  it("enforces cloudflare access identity when required", async () => {
    mocks.getHostRuntimeConfigMock.mockReturnValue({
      appBaseUrl: "https://spookynexus.com",
      adminBaseUrl: "https://admin.spookynexus.com",
      adminRequireCfAccess: true,
    });
    mockHeaders({
      host: "admin.spookynexus.com",
    });
    await expect(assertAdminHostAccess()).rejects.toMatchObject({ code: "forbidden" });
  });

  it("accepts admin mutation origin from admin host and rejects non-admin host", async () => {
    await expect(assertAdminMutationOrigin()).resolves.toBe(true);

    mockHeaders({
      host: "admin.spookynexus.com",
      origin: "https://spookynexus.com",
      referer: "https://spookynexus.com/admin/products",
    });
    await expect(assertAdminMutationOrigin()).rejects.toMatchObject({ code: "forbidden" });
  });

  it("returns route access false when host boundary blocks route", async () => {
    mockHeaders({
      host: "spookynexus.com",
    });
    await expect(getRouteAccess("products")).resolves.toEqual({
      role: null,
      allowed: false,
    });
  });

  it("returns route access false for unauthenticated session user", async () => {
    mocks.getSessionUserMock.mockResolvedValue(null);
    await expect(getRouteAccess("products")).resolves.toEqual({
      role: null,
      allowed: false,
    });
  });

  it("allows route access for manager on allowed route", async () => {
    mocks.getSessionUserMock.mockResolvedValue({
      id: "user_manager",
      email: "manager@base-ecommerce.local",
      role: "manager",
      emailVerified: true,
      authenticatedAt: "2026-03-17T12:00:00.000Z",
    });
    await expect(getRouteAccess("products")).resolves.toEqual({
      role: "manager",
      allowed: true,
    });
  });

  it("maps ensurePermission failures for unauthenticated, forbidden, and recent-auth-required paths", async () => {
    mocks.getSessionUserMock.mockResolvedValue(null);
    await expect(ensurePermission("catalog:write")).rejects.toMatchObject({
      code: "unauthorized",
    });

    mocks.getSessionUserMock.mockResolvedValue({
      id: "user_catalog",
      email: "catalog@base-ecommerce.local",
      role: "catalog",
      emailVerified: true,
      authenticatedAt: "2026-03-17T12:00:00.000Z",
    });
    await expect(ensurePermission("catalog:write")).rejects.toMatchObject({
      code: "forbidden",
    });

    mocks.getSessionUserMock.mockResolvedValue({
      id: "user_manager",
      email: "manager@base-ecommerce.local",
      role: "manager",
      emailVerified: true,
      authenticatedAt: "2026-03-17T12:00:00.000Z",
    });
    mocks.isRecentAuthenticationMock.mockReturnValue(false);
    await expect(ensurePermission("catalog:write")).rejects.toMatchObject({
      code: "recent_auth_required",
    });
  });

  it("returns role when ensurePermission passes for write action", async () => {
    mocks.getSessionUserMock.mockResolvedValue({
      id: "user_owner",
      email: "owner@base-ecommerce.local",
      role: "owner",
      emailVerified: true,
      authenticatedAt: "2026-03-17T12:00:00.000Z",
    });
    mocks.isRecentAuthenticationMock.mockReturnValue(true);
    await expect(ensurePermission("catalog:write")).resolves.toBe("owner");
  });
});
