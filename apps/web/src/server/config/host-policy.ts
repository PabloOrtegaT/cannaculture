import psl from "psl";

export type HostSurface = "storefront" | "admin";

type HostPolicyInput = {
  appBaseUrl?: string | undefined;
  adminBaseUrl?: string | undefined;
  adminRequireCfAccess?: boolean;
};

export type HostPolicy = {
  appBaseUrl: string;
  adminBaseUrl: string;
  appHost: string;
  adminHost: string;
  adminRequireCfAccess: boolean;
};

export function normalizeHost(hostValue: string | null | undefined) {
  if (!hostValue) {
    return "";
  }
  return hostValue.trim().toLowerCase().replace(/:\d+$/, "");
}

function hostFromUrl(urlValue: string) {
  try {
    return normalizeHost(new URL(urlValue).host);
  } catch {
    return "";
  }
}

function hostnameFromUrl(urlValue: string) {
  try {
    return normalizeHost(new URL(urlValue).hostname);
  } catch {
    return "";
  }
}

function isLoopbackAliasHostname(hostname: string) {
  const normalized = normalizeHost(hostname);
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".lvh.me") ||
    normalized.endsWith(".nip.io") ||
    normalized.endsWith(".sslip.io")
  );
}

function shouldDisableSplitHostMode(appBaseUrl: string, adminBaseUrl: string) {
  if (appBaseUrl === adminBaseUrl) {
    return false;
  }

  const appHostname = hostnameFromUrl(appBaseUrl);
  const adminHostname = hostnameFromUrl(adminBaseUrl);
  if (!appHostname || !adminHostname) {
    return false;
  }

  const isLocalPair = isLoopbackAliasHostname(appHostname) || isLoopbackAliasHostname(adminHostname);
  if (!isLocalPair) {
    return false;
  }

  return !resolveSharedCookieDomain(appBaseUrl, adminBaseUrl);
}

export function resolveHostPolicy(input: HostPolicyInput): HostPolicy {
  const appBaseUrl = input.appBaseUrl ?? "http://127.0.0.1:3000";
  const requestedAdminBaseUrl = input.adminBaseUrl ?? appBaseUrl;
  const adminBaseUrl = shouldDisableSplitHostMode(appBaseUrl, requestedAdminBaseUrl) ? appBaseUrl : requestedAdminBaseUrl;
  const appHost = hostFromUrl(appBaseUrl);
  const adminHost = hostFromUrl(adminBaseUrl);

  return {
    appBaseUrl,
    adminBaseUrl,
    appHost,
    adminHost,
    adminRequireCfAccess: Boolean(input.adminRequireCfAccess),
  };
}

export function isAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function isAuthPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/logout" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/verify-email" ||
    pathname === "/auth/after-login"
  );
}

export function isStaticOrInternalPath(pathname: string) {
  return pathname.startsWith("/_next") || pathname === "/favicon.ico" || pathname === "/robots.txt" || pathname === "/sitemap.xml";
}

export function isAllowedOnAdminHost(pathname: string) {
  if (isStaticOrInternalPath(pathname)) {
    return true;
  }
  if (isAdminPath(pathname) || isAuthPath(pathname)) {
    return true;
  }
  if (pathname.startsWith("/api/auth/")) {
    return true;
  }
  return false;
}

export function resolveSurfaceForHost(policy: HostPolicy, host: string): HostSurface {
  const normalizedHost = normalizeHost(host);
  if (normalizedHost && normalizedHost === policy.adminHost) {
    return "admin";
  }
  return "storefront";
}

export function buildAbsoluteUrl(baseUrl: string, pathname: string, search = "") {
  const url = new URL(pathname, baseUrl);
  if (search) {
    url.search = search;
  }
  return url.toString();
}

export function resolveAdminEntryHref(appBaseUrl: string, adminBaseUrl: string, pathname = "/admin") {
  const policy = resolveHostPolicy({
    appBaseUrl,
    adminBaseUrl,
  });

  if (!policy.adminHost || policy.adminHost === policy.appHost) {
    return pathname;
  }

  return buildAbsoluteUrl(policy.adminBaseUrl, pathname);
}

export function isLocalDevelopmentHost(host: string) {
  const normalized = normalizeHost(host);
  return isLoopbackAliasHostname(normalized);
}

function parseHostnameFromUrl(urlValue: string) {
  try {
    return new URL(urlValue).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function resolveSharedCookieDomain(appBaseUrl: string, adminBaseUrl: string) {
  const appHostname = parseHostnameFromUrl(appBaseUrl);
  const adminHostname = parseHostnameFromUrl(adminBaseUrl);
  if (!appHostname || !adminHostname || appHostname === adminHostname) {
    return undefined;
  }

  const blockedHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  if (blockedHosts.has(appHostname) || blockedHosts.has(adminHostname)) {
    return undefined;
  }

  if (appHostname.endsWith(`.${adminHostname}`)) {
    return `.${adminHostname}`;
  }
  if (adminHostname.endsWith(`.${appHostname}`)) {
    return `.${appHostname}`;
  }

  const appRegistrable = psl.get(appHostname);
  const adminRegistrable = psl.get(adminHostname);
  if (!appRegistrable || appRegistrable !== adminRegistrable) {
    return undefined;
  }

  return `.${appRegistrable}`;
}
