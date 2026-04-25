import { NextResponse } from "next/server";
import { getDb } from "@/server/db/client";
import { getAuthSweepRuntimeConfig } from "@/server/config/runtime-env";
import { PRIVATE_NO_STORE } from "@/server/http/cache-headers";
import { sweepExpiredRefreshSessions } from "@/server/auth/refresh-sessions";

export async function POST(request: Request) {
  const env = getAuthSweepRuntimeConfig();
  const expectedToken = env.sweeperToken;

  if (!expectedToken) {
    return new NextResponse("Sweeper not configured", {
      status: 503,
      headers: PRIVATE_NO_STORE,
    });
  }

  const authHeader = request.headers.get("authorization");
  const providedToken = authHeader?.replace("Bearer ", "").trim();

  if (!providedToken || providedToken !== expectedToken) {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: PRIVATE_NO_STORE,
    });
  }

  try {
    const db = getDb();
    const deleted = await sweepExpiredRefreshSessions(db);
    return NextResponse.json(
      { deleted },
      { headers: PRIVATE_NO_STORE },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500, headers: PRIVATE_NO_STORE },
    );
  }
}
