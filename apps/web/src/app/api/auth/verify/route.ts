import { NextResponse } from "next/server";
import { PRIVATE_NO_STORE } from "@/server/http/cache-headers";
import { verifyEmailByToken } from "@/server/auth/service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/verify-email?error=missing_token", request.url), {
      headers: PRIVATE_NO_STORE,
    });
  }

  const result = await verifyEmailByToken(token);
  return NextResponse.redirect(new URL(result.redirectTo, request.url), {
    headers: PRIVATE_NO_STORE,
  });
}

