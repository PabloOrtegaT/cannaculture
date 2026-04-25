import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { PRIVATE_NO_STORE } from "@/server/http/cache-headers";
import { revokeRefreshSessionByIdForUser } from "@/server/auth/refresh-sessions";

type DeleteSessionParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_request: Request, { params }: DeleteSessionParams) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: PRIVATE_NO_STORE },
    );
  }

  const routeParams = await params;
  const revoked = await revokeRefreshSessionByIdForUser(routeParams.id, user.id);
  if (!revoked) {
    return NextResponse.json(
      { error: "Session not found." },
      { status: 404, headers: PRIVATE_NO_STORE },
    );
  }

  return NextResponse.json({ ok: true }, { headers: PRIVATE_NO_STORE });
}
