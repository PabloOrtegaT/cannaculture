import { NextResponse, type NextRequest } from "next/server";
import {
  buildAbsoluteUrl,
  isAdminPath,
  isAllowedOnAdminHost,
  normalizeHost,
  resolveHostPolicy,
} from "@/server/config/host-policy";

function getHostPolicy() {
  return resolveHostPolicy({
    appBaseUrl: process.env.APP_BASE_URL,
    adminBaseUrl: process.env.ADMIN_BASE_URL,
    adminRequireCfAccess: process.env.ADMIN_REQUIRE_CF_ACCESS === "1" || process.env.ADMIN_REQUIRE_CF_ACCESS === "true",
  });
}

export function middleware(request: NextRequest) {
  const policy = getHostPolicy();
  if (!policy.appHost || !policy.adminHost || policy.appHost === policy.adminHost) {
    return NextResponse.next();
  }

  const requestHost = normalizeHost(request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  const pathname = request.nextUrl.pathname;
  const search = request.nextUrl.search;
  const onAdminHost = requestHost === policy.adminHost;
  const onAppHost = requestHost === policy.appHost;

  if (onAppHost && isAdminPath(pathname)) {
    return NextResponse.redirect(buildAbsoluteUrl(policy.adminBaseUrl, pathname, search));
  }

  if (!onAdminHost) {
    return NextResponse.next();
  }

  if (policy.adminRequireCfAccess && isAdminPath(pathname)) {
    const accessIdentity = request.headers.get("cf-access-authenticated-user-email");
    if (!accessIdentity) {
      return new NextResponse("Cloudflare Access authentication required.", { status: 403 });
    }
  }

  if (pathname === "/") {
    return NextResponse.redirect(buildAbsoluteUrl(policy.adminBaseUrl, "/admin"));
  }

  if (!isAllowedOnAdminHost(pathname)) {
    return NextResponse.redirect(buildAbsoluteUrl(policy.appBaseUrl, pathname, search));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
