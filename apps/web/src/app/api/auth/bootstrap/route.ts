import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { createRefreshSession, rotateRefreshSessionById } from "@/server/auth/refresh-sessions";
import { getRequestClientContext, resolveSurfaceFromRequest } from "@/server/auth/request-context";
import { setRefreshCookie } from "@/server/auth/refresh-cookie";
import { normalizeHost } from "@/server/config/host-policy";
import { PRIVATE_NO_STORE } from "@/server/http/cache-headers";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: PRIVATE_NO_STORE },
    );
  }

  const surface = resolveSurfaceFromRequest(request);
  const context = getRequestClientContext(request);

  let refreshIssue = user.sid ? await rotateRefreshSessionById(user.sid, context) : null;
  if (!refreshIssue) {
    refreshIssue = await createRefreshSession(user.id, surface, context);
  }

  const response = NextResponse.json(
    {
      ok: true,
      sid: refreshIssue.session.id,
      surface,
    },
    { headers: PRIVATE_NO_STORE },
  );
  const requestHost = normalizeHost(request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  setRefreshCookie(response.cookies, surface, refreshIssue.rawToken, requestHost);
  return response;
}
