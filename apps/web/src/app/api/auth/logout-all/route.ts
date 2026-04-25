import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { clearAllRefreshCookies } from "@/server/auth/refresh-cookie";
import { revokeAllRefreshSessionsForUser } from "@/server/auth/refresh-sessions";
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

  await revokeAllRefreshSessionsForUser(user.id);

  const response = NextResponse.json({ ok: true }, { headers: PRIVATE_NO_STORE });
  const requestHost = normalizeHost(request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  clearAllRefreshCookies(response.cookies, requestHost);
  return response;
}
