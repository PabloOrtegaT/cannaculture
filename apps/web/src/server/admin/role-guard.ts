import { canRolePerform, type Permission, type Role } from "@base-ecommerce/domain";
import { getAdminRole } from "./session";

export const adminRouteKeys = ["dashboard", "products", "content", "coupons", "import"] as const;
export type AdminRouteKey = (typeof adminRouteKeys)[number];

const routePermissions: Record<AdminRouteKey, Permission> = {
  dashboard: "content:read",
  products: "catalog:read",
  content: "content:read",
  coupons: "orders:write",
  import: "catalog:write",
};

export function canAccessAdminRoute(role: Role, route: AdminRouteKey) {
  const requiredPermission = routePermissions[route];
  return canRolePerform(role, requiredPermission);
}

export function canAccessAdminPermission(role: Role, permission: Permission) {
  return canRolePerform(role, permission);
}

export function getRouteAccess(route: AdminRouteKey, env: NodeJS.ProcessEnv = process.env) {
  const role = getAdminRole(env);
  return {
    role,
    allowed: canAccessAdminRoute(role, route),
  };
}

export function getPermissionAccess(permission: Permission, env: NodeJS.ProcessEnv = process.env) {
  const role = getAdminRole(env);
  return {
    role,
    allowed: canAccessAdminPermission(role, permission),
  };
}
