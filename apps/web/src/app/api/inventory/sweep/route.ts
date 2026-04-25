import { NextResponse } from "next/server";
import { getRuntimeEnvironment } from "@/server/config/runtime-env";
import { PRIVATE_NO_STORE } from "@/server/http/cache-headers";
import { sweepExpiredInventoryHolds } from "@/server/inventory/service";

export async function POST(request: Request) {
  const env = getRuntimeEnvironment();
  const expectedToken = env.INVENTORY_SWEEPER_TOKEN;

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
    const result = await sweepExpiredInventoryHolds();
    return NextResponse.json(
      {
        success: true,
        sweptCount: result.sweptCount,
        restoredCount: result.restoredCount,
      },
      { headers: PRIVATE_NO_STORE },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500, headers: PRIVATE_NO_STORE },
    );
  }
}
