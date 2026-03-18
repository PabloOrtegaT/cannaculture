import { describe, expect, it } from "vitest";
import { canAccessAdminPermission, canAccessAdminRoute, isAdminRole, isValidAdminMutationOrigin } from "@/server/admin/role-guard";

describe("admin route guards", () => {
  it("owner can access all admin routes", () => {
    expect(canAccessAdminRoute("owner", "dashboard")).toBe(true);
    expect(canAccessAdminRoute("owner", "categories")).toBe(true);
    expect(canAccessAdminRoute("owner", "products")).toBe(true);
    expect(canAccessAdminRoute("owner", "content")).toBe(true);
    expect(canAccessAdminRoute("owner", "coupons")).toBe(true);
    expect(canAccessAdminRoute("owner", "import")).toBe(true);
  });

  it("catalog role cannot access any admin route", () => {
    expect(canAccessAdminRoute("catalog", "dashboard")).toBe(false);
    expect(canAccessAdminRoute("catalog", "categories")).toBe(false);
    expect(canAccessAdminRoute("catalog", "content")).toBe(false);
    expect(canAccessAdminRoute("catalog", "coupons")).toBe(false);
    expect(canAccessAdminRoute("catalog", "products")).toBe(false);
    expect(canAccessAdminRoute("catalog", "import")).toBe(false);
  });

  it("manager can access allowed admin routes", () => {
    expect(canAccessAdminRoute("manager", "dashboard")).toBe(true);
    expect(canAccessAdminRoute("manager", "categories")).toBe(true);
    expect(canAccessAdminRoute("manager", "products")).toBe(true);
    expect(canAccessAdminRoute("manager", "content")).toBe(true);
    expect(canAccessAdminRoute("manager", "coupons")).toBe(true);
    expect(canAccessAdminRoute("manager", "import")).toBe(true);
  });

  it("enforces admin-role boundary for permissions", () => {
    expect(isAdminRole("owner")).toBe(true);
    expect(isAdminRole("manager")).toBe(true);
    expect(isAdminRole("catalog")).toBe(false);
    expect(canAccessAdminPermission("manager", "orders:write")).toBe(true);
    expect(canAccessAdminPermission("catalog", "orders:write")).toBe(false);
    expect(canAccessAdminPermission("catalog", "catalog:write")).toBe(false);
  });

  it("validates mutation origin host constraints for admin writes", () => {
    expect(isValidAdminMutationOrigin("admin.spookynexus.com", "admin.spookynexus.com", "")).toBe(true);
    expect(isValidAdminMutationOrigin("admin.spookynexus.com", "", "admin.spookynexus.com")).toBe(true);
    expect(isValidAdminMutationOrigin("admin.spookynexus.com", "spookynexus.com", "admin.spookynexus.com")).toBe(false);
    expect(isValidAdminMutationOrigin("admin.spookynexus.com", "", "spookynexus.com")).toBe(false);
  });
});
