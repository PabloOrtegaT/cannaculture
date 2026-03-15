import type { ResponseCookies } from "next/dist/server/web/spec-extension/cookies";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import type { HostSurface } from "@/server/config/host-policy";
import { isLocalDevelopmentHost, normalizeHost, resolveHostPolicy, resolveSurfaceForHost } from "@/server/config/host-policy";
import { getAuthRuntimeConfig, getHostRuntimeConfig } from "@/server/config/runtime-env";

export const STOREFRONT_REFRESH_COOKIE = "be_refresh_storefront";
export const ADMIN_REFRESH_COOKIE = "be_refresh_admin";

type ReadableCookieStore = {
  get(name: string): { value: string } | undefined;
};

export function getRefreshCookieName(surface: HostSurface) {
  return surface === "admin" ? ADMIN_REFRESH_COOKIE : STOREFRONT_REFRESH_COOKIE;
}

export function getAllRefreshCookieNames() {
  return [STOREFRONT_REFRESH_COOKIE, ADMIN_REFRESH_COOKIE] as const;
}

function resolveRefreshCookieMaxAgeSeconds(surface: HostSurface) {
  const authConfig = getAuthRuntimeConfig();
  if (surface === "admin") {
    return authConfig.adminRefreshAbsoluteDays * 24 * 60 * 60;
  }
  return authConfig.refreshAbsoluteDays * 24 * 60 * 60;
}

function resolveRequestHost(request: NextRequest | Request) {
  return normalizeHost(request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
}

export function resolveSurfaceForRequest(request: NextRequest | Request): HostSurface {
  const hostConfig = getHostRuntimeConfig();
  const policy = resolveHostPolicy({
    appBaseUrl: hostConfig.appBaseUrl,
    adminBaseUrl: hostConfig.adminBaseUrl,
  });
  return resolveSurfaceForHost(policy, resolveRequestHost(request));
}

export function readRefreshTokenFromCookieStore(cookieStore: ReadableCookieStore, surface: HostSurface) {
  return cookieStore.get(getRefreshCookieName(surface))?.value ?? null;
}

export async function readRefreshTokenForCurrentRequest(surface?: HostSurface) {
  const cookieStore = await cookies();
  if (surface) {
    return readRefreshTokenFromCookieStore(cookieStore, surface);
  }

  for (const cookieName of getAllRefreshCookieNames()) {
    const value = cookieStore.get(cookieName)?.value;
    if (value) {
      return value;
    }
  }
  return null;
}

export function setRefreshCookie(responseCookies: ResponseCookies, surface: HostSurface, token: string, host: string) {
  responseCookies.set({
    name: getRefreshCookieName(surface),
    value: token,
    httpOnly: true,
    secure: !isLocalDevelopmentHost(host),
    sameSite: "lax",
    path: "/",
    maxAge: resolveRefreshCookieMaxAgeSeconds(surface),
  });
}

export function clearRefreshCookie(responseCookies: ResponseCookies, surface: HostSurface, host: string) {
  responseCookies.set({
    name: getRefreshCookieName(surface),
    value: "",
    httpOnly: true,
    secure: !isLocalDevelopmentHost(host),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function clearAllRefreshCookies(responseCookies: ResponseCookies, host: string) {
  for (const cookieName of getAllRefreshCookieNames()) {
    responseCookies.set({
      name: cookieName,
      value: "",
      httpOnly: true,
      secure: !isLocalDevelopmentHost(host),
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
}
