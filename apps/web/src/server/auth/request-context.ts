import { normalizeHost, resolveHostPolicy, resolveSurfaceForHost, type HostSurface } from "@/server/config/host-policy";
import { getHostRuntimeConfig } from "@/server/config/runtime-env";

function firstIpFromHeader(value: string | null) {
  if (!value) {
    return null;
  }
  const first = value.split(",")[0];
  return first ? first.trim() : null;
}

export function resolveSurfaceFromRequest(request: Request): HostSurface {
  const hostConfig = getHostRuntimeConfig();
  const policy = resolveHostPolicy({
    appBaseUrl: hostConfig.appBaseUrl,
    adminBaseUrl: hostConfig.adminBaseUrl,
  });
  const host = normalizeHost(request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  return resolveSurfaceForHost(policy, host);
}

export function getRequestClientContext(request: Request) {
  return {
    userAgent: request.headers.get("user-agent"),
    ipAddress: firstIpFromHeader(request.headers.get("x-forwarded-for")) ?? request.headers.get("cf-connecting-ip"),
    deviceId: request.headers.get("x-device-id"),
  };
}
