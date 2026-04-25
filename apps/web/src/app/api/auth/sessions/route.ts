import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { PRIVATE_NO_STORE } from "@/server/http/cache-headers";
import { listActiveRefreshSessionsForUser } from "@/server/auth/refresh-sessions";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: PRIVATE_NO_STORE },
    );
  }

  const sessions = await listActiveRefreshSessionsForUser(user.id);
  return NextResponse.json(
    {
      sessions: sessions.map((session) => ({
        id: session.id,
        surface: session.surface,
        deviceId: session.deviceId,
        userAgent: session.userAgent,
        createdAt: session.createdAt.toISOString(),
        lastSeenAt: session.lastSeenAt.toISOString(),
        idleExpiresAt: session.idleExpiresAt.toISOString(),
        absoluteExpiresAt: session.absoluteExpiresAt.toISOString(),
      })),
    },
    { headers: PRIVATE_NO_STORE },
  );
}
