import { NextResponse } from "next/server";
import { resetPasswordByToken } from "@/server/auth/service";
import { resetPasswordInputSchema } from "@/server/auth/validation";

export async function POST(request: Request) {
  const formData = await request.formData();
  const payload = resetPasswordInputSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });

  if (!payload.success) {
    return NextResponse.redirect(new URL("/reset-password?error=invalid_input", request.url));
  }

  const result = await resetPasswordByToken(payload.data.token, payload.data.password);
  if (!result.ok) {
    return NextResponse.redirect(new URL(`/reset-password?token=${payload.data.token}&error=invalid_token`, request.url));
  }

  return NextResponse.redirect(new URL(result.redirectTo, request.url));
}

