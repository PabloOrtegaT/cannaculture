import { NextResponse } from "next/server";
import { readRefreshTokenForCurrentRequest, setRefreshCookie } from "@/server/auth/refresh-cookie";
import { getRequestClientContext, resolveSurfaceFromRequest } from "@/server/auth/request-context";
import { rotateRefreshSessionByToken } from "@/server/auth/refresh-sessions";
import { normalizeHost } from "@/server/config/host-policy";

export async function POST(request: Request) {
  const surface = resolveSurfaceFromRequest(request);
  const token = await readRefreshTokenForCurrentRequest(surface);
  if (!token) {
    return NextResponse.json({ error: "Missing refresh token." }, { status: 401 });
  }

  const rotated = await rotateRefreshSessionByToken(token, getRequestClientContext(request));
  if (!rotated) {
    return NextResponse.json({ error: "Invalid or expired refresh session." }, { status: 401 });
  }

  const response = NextResponse.json({
    ok: true,
    sid: rotated.session.id,
    surface,
  });
  const requestHost = normalizeHost(request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  setRefreshCookie(response.cookies, surface, rotated.rawToken, requestHost);
  return response;
}
