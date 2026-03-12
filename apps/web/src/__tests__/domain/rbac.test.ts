import { describe, expect, it } from "vitest";
import { canRolePerform, permissionSchema, roleSchema } from "@base-ecommerce/domain";

describe("RBAC permission matrix", () => {
  it("owner can perform every permission", () => {
    const owner = roleSchema.parse("owner");
    for (const permission of permissionSchema.options) {
      expect(canRolePerform(owner, permission)).toBe(true);
    }
  });

  it("manager cannot manage roles, but can write catalog and orders", () => {
    const manager = roleSchema.parse("manager");
    expect(canRolePerform(manager, "catalog:write")).toBe(true);
    expect(canRolePerform(manager, "orders:write")).toBe(true);
    expect(canRolePerform(manager, "roles:manage")).toBe(false);
  });

  it("catalog role is restricted to catalog/inventory domain", () => {
    const catalog = roleSchema.parse("catalog");
    expect(canRolePerform(catalog, "catalog:write")).toBe(true);
    expect(canRolePerform(catalog, "inventory:adjust")).toBe(true);
    expect(canRolePerform(catalog, "content:write")).toBe(false);
    expect(canRolePerform(catalog, "orders:write")).toBe(false);
  });
});
