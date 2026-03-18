import { NextResponse } from "next/server";
import { isAdminRole } from "@/server/admin/role-guard";
import { getSessionUser } from "@/server/auth/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({
      authenticated: false,
    });
  }

  return NextResponse.json({
    authenticated: true,
    email: user.email,
    role: user.role,
    isAdmin: isAdminRole(user.role),
  });
}

