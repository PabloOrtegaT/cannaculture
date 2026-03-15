import { NextResponse } from "next/server";
import { registerEmailPasswordUser } from "@/server/auth/service";
import { registerInputSchema } from "@/server/auth/validation";

export async function POST(request: Request) {
  const formData = await request.formData();
  const payload = registerInputSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!payload.success) {
    return NextResponse.redirect(new URL("/register?error=invalid_input", request.url));
  }

  try {
    const result = await registerEmailPasswordUser(payload.data);
    return NextResponse.redirect(new URL(result.redirectTo, request.url));
  } catch (error) {
    const message = error instanceof Error ? error.message : "register_failed";
    return NextResponse.redirect(new URL(`/register?error=${encodeURIComponent(message)}`, request.url));
  }
}

