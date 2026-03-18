import { NextResponse } from "next/server";
import { trackError, trackWarn } from "@/server/observability/telemetry";
import { enforceRateLimit, getClientIpFromRequest } from "@/server/security/rate-limit";
import { registerEmailPasswordUser } from "@/server/auth/service";
import { registerInputSchema } from "@/server/auth/validation";

function redirect303(request: Request, pathname: string) {
  return NextResponse.redirect(new URL(pathname, request.url), { status: 303 });
}

export async function POST(request: Request) {
  const clientIp = getClientIpFromRequest(request);
  const rateLimit = enforceRateLimit({
    key: `auth:register:${clientIp}`,
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    trackWarn({
      scope: "api.auth.register",
      message: "rate_limited",
      metadata: { ip: clientIp, retryAfterSeconds: rateLimit.retryAfterSeconds },
    });
    return redirect303(request, "/register?error=rate_limited");
  }

  const requestOrigin = new URL(request.url).origin;
  const formData = await request.formData();
  const payload = registerInputSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!payload.success) {
    return redirect303(request, "/register?error=invalid_input");
  }

  try {
    const result = await registerEmailPasswordUser({
      ...payload.data,
      origin: requestOrigin,
    });
    return redirect303(request, result.redirectTo);
  } catch (error) {
    const message = error instanceof Error ? error.message : "register_failed";
    trackError("api.auth.register", error, { ip: clientIp });
    return redirect303(request, `/register?error=${encodeURIComponent(message)}`);
  }
}
