import { z } from "zod";

export const roleSchema = z.enum(["owner", "manager", "catalog"]);
export type Role = z.infer<typeof roleSchema>;

export const permissionSchema = z.enum([
  "catalog:read",
  "catalog:write",
  "inventory:adjust",
  "content:read",
  "content:write",
  "orders:read",
  "orders:write",
  "roles:manage",
]);
export type Permission = z.infer<typeof permissionSchema>;

const allPermissions = permissionSchema.options;

export const rolePermissions: Record<Role, ReadonlySet<Permission>> = {
  owner: new Set(allPermissions),
  manager: new Set([
    "catalog:read",
    "catalog:write",
    "inventory:adjust",
    "content:read",
    "content:write",
    "orders:read",
    "orders:write",
  ]),
  catalog: new Set(["catalog:read", "catalog:write", "inventory:adjust", "content:read"]),
};

export function canRolePerform(role: Role, permission: Permission) {
  roleSchema.parse(role);
  permissionSchema.parse(permission);
  return rolePermissions[role].has(permission);
}
