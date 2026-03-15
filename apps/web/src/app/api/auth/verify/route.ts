import { NextResponse } from "next/server";
import { verifyEmailByToken } from "@/server/auth/service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/verify-email?error=missing_token", request.url));
  }

  const result = await verifyEmailByToken(token);
  return NextResponse.redirect(new URL(result.redirectTo, request.url));
}

