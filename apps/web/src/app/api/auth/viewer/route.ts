import { NextResponse } from "next/server";
import { isAdminRole } from "@/server/admin/role-guard";
import { getSessionUser } from "@/server/auth/session";
import { PRIVATE_NO_STORE } from "@/server/http/cache-headers";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      {
        authenticated: false,
      },
      { headers: PRIVATE_NO_STORE },
    );
  }

  return NextResponse.json(
    {
      authenticated: true,
      email: user.email,
      role: user.role,
      isAdmin: isAdminRole(user.role),
    },
    { headers: PRIVATE_NO_STORE },
  );
}

