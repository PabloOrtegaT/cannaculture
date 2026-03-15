import type { HostSurface } from "@/server/config/host-policy";
import { getAuthRuntimeConfig } from "@/server/config/runtime-env";

export function getRefreshWindowMs(surface: HostSurface) {
  const config = getAuthRuntimeConfig();
  if (surface === "admin") {
    return {
      idleMs: config.adminRefreshIdleHours * 60 * 60 * 1000,
      absoluteMs: config.adminRefreshAbsoluteDays * 24 * 60 * 60 * 1000,
    };
  }

  return {
    idleMs: config.refreshIdleDays * 24 * 60 * 60 * 1000,
    absoluteMs: config.refreshAbsoluteDays * 24 * 60 * 60 * 1000,
  };
}

export function getAccessTokenWindowSeconds() {
  return getAuthRuntimeConfig().accessTtlSeconds;
}

export function isRecentAuthentication(authenticatedAt: Date, thresholdMs: number) {
  return Date.now() - authenticatedAt.getTime() <= thresholdMs;
}
