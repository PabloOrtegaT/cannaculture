import { NextResponse } from "next/server";
import { clearRefreshCookie, readRefreshTokenForCurrentRequest } from "@/server/auth/refresh-cookie";
import { resolveSurfaceFromRequest } from "@/server/auth/request-context";
import { revokeRefreshSessionByToken } from "@/server/auth/refresh-sessions";
import { normalizeHost } from "@/server/config/host-policy";

export async function POST(request: Request) {
  const surface = resolveSurfaceFromRequest(request);
  const refreshToken = await readRefreshTokenForCurrentRequest(surface);
  if (refreshToken) {
    await revokeRefreshSessionByToken(refreshToken);
  }

  const response = NextResponse.json({ ok: true });
  const requestHost = normalizeHost(request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  clearRefreshCookie(response.cookies, surface, requestHost);
  return response;
}
