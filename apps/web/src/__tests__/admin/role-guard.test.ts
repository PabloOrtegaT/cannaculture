import { describe, expect, it } from "vitest";
import { canAccessAdminRoute, getRouteAccess } from "@/server/admin/role-guard";

describe("admin route guards", () => {
  it("owner can access all admin routes", () => {
    expect(canAccessAdminRoute("owner", "dashboard")).toBe(true);
    expect(canAccessAdminRoute("owner", "products")).toBe(true);
    expect(canAccessAdminRoute("owner", "content")).toBe(true);
    expect(canAccessAdminRoute("owner", "coupons")).toBe(true);
    expect(canAccessAdminRoute("owner", "import")).toBe(true);
  });

  it("catalog role cannot access coupon management", () => {
    expect(canAccessAdminRoute("catalog", "coupons")).toBe(false);
    expect(canAccessAdminRoute("catalog", "products")).toBe(true);
    expect(canAccessAdminRoute("catalog", "import")).toBe(true);
  });

  it("reads role from env for route access checks", () => {
    const access = getRouteAccess("products", {
      ...process.env,
      ADMIN_ROLE: "manager",
    });

    expect(access.role).toBe("manager");
    expect(access.allowed).toBe(true);
  });
});
