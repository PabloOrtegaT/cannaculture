import { headers } from "next/headers";
import { canRolePerform, type Permission, type Role } from "@base-ecommerce/domain";
import { normalizeHost, resolveHostPolicy } from "@/server/config/host-policy";
import { getAuthRuntimeConfig, getHostRuntimeConfig } from "@/server/config/runtime-env";
import { getSessionUser } from "@/server/auth/session";
import { isRecentAuthentication } from "@/server/auth/refresh-session-policy";
import { createAdminMutationError } from "./mutation-errors";

export const adminRouteKeys = ["dashboard", "categories", "products", "content", "coupons", "import"] as const;
export type AdminRouteKey = (typeof adminRouteKeys)[number];

const routePermissions: Record<AdminRouteKey, Permission> = {
  dashboard: "content:read",
  categories: "catalog:read",
  products: "catalog:read",
  content: "content:read",
  coupons: "orders:write",
  import: "catalog:write",
};

const adminRoles = new Set<Role>(["owner", "manager"]);

export function isAdminRole(role: Role) {
  return adminRoles.has(role);
}

export function canAccessAdminRoute(role: Role, route: AdminRouteKey) {
  if (!isAdminRole(role)) {
    return false;
  }
  const requiredPermission = routePermissions[route];
  return canRolePerform(role, requiredPermission);
}

export function canAccessAdminPermission(role: Role, permission: Permission) {
  if (!isAdminRole(role)) {
    return false;
  }
  return canRolePerform(role, permission);
}

function readHostFromUrl(rawValue: string | null) {
  if (!rawValue) {
    return "";
  }
  try {
    return normalizeHost(new URL(rawValue).host);
  } catch {
    return "";
  }
}

export async function assertAdminHostAccess() {
  const requestHeaders = await headers();
  const requestHost = normalizeHost(requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"));
  const hostConfig = getHostRuntimeConfig();
  const policy = resolveHostPolicy({
    appBaseUrl: hostConfig.appBaseUrl,
    adminBaseUrl: hostConfig.adminBaseUrl,
  });

  if (!policy.adminHost || policy.adminHost === policy.appHost) {
    return true;
  }

  if (requestHost !== policy.adminHost) {
    throw createAdminMutationError("forbidden", "Admin routes/actions must be accessed from the admin host.");
  }

  if (hostConfig.adminRequireCfAccess) {
    const cfIdentity = requestHeaders.get("cf-access-authenticated-user-email");
    if (!cfIdentity) {
      throw createAdminMutationError("forbidden", "Cloudflare Access authentication is required for admin.");
    }
  }
  return true;
}

export async function assertAdminMutationOrigin() {
  const requestHeaders = await headers();
  const hostConfig = getHostRuntimeConfig();
  const policy = resolveHostPolicy({
    appBaseUrl: hostConfig.appBaseUrl,
    adminBaseUrl: hostConfig.adminBaseUrl,
  });

  if (!policy.adminHost || policy.adminHost === policy.appHost) {
    return true;
  }

  const originHost = readHostFromUrl(requestHeaders.get("origin"));
  const refererHost = readHostFromUrl(requestHeaders.get("referer"));
  if (!isValidAdminMutationOrigin(policy.adminHost, originHost, refererHost)) {
    throw createAdminMutationError("forbidden", "Invalid origin for admin mutation.");
  }

  return true;
}

export function isValidAdminMutationOrigin(adminHost: string, originHost: string, refererHost: string) {
  if (originHost && originHost !== adminHost) {
    return false;
  }

  if (!originHost && refererHost && refererHost !== adminHost) {
    return false;
  }

  return true;
}

export async function getRouteAccess(route: AdminRouteKey) {
  try {
    await assertAdminHostAccess();
  } catch {
    return {
      role: null,
      allowed: false,
    };
  }

  const user = await getSessionUser();
  if (!user) {
    return {
      role: null,
      allowed: false,
    };
  }

  const role = user.role;
  return {
    role,
    allowed: canAccessAdminRoute(role, route),
  };
}

export async function ensurePermission(permission: Permission) {
  await assertAdminHostAccess();
  await assertAdminMutationOrigin();
  const user = await getSessionUser();
  if (!user) {
    throw createAdminMutationError("unauthorized", "Please sign in before performing this action.");
  }

  const role = user.role;
  if (!canAccessAdminPermission(role, permission)) {
    throw createAdminMutationError("forbidden", `Role ${role} cannot perform action "${permission}".`);
  }

  if (permission.endsWith(":write")) {
    const recentWindowMs = getAuthRuntimeConfig().adminRefreshIdleHours * 60 * 60 * 1000;
    if (!isRecentAuthentication(user.authenticatedAt, recentWindowMs)) {
      throw createAdminMutationError("recent_auth_required", "Please sign in again before changing admin data.");
    }
  }

  return role;
}
