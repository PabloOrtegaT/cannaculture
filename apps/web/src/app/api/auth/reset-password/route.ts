import { NextResponse } from "next/server";
import { trackError, trackWarn } from "@/server/observability/telemetry";
import { enforceRateLimit, getClientIpFromRequest } from "@/server/security/rate-limit";
import { resetPasswordByToken } from "@/server/auth/service";
import { resetPasswordInputSchema } from "@/server/auth/validation";

function redirect303(request: Request, pathname: string) {
  return NextResponse.redirect(new URL(pathname, request.url), { status: 303 });
}

export async function POST(request: Request) {
  const clientIp = getClientIpFromRequest(request);
  const rateLimit = await enforceRateLimit({
    key: `auth:reset-password:${clientIp}`,
    maxRequests: 5,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    trackWarn({
      scope: "api.auth.reset-password",
      message: "rate_limited",
      metadata: { ip: clientIp, retryAfterSeconds: rateLimit.retryAfterSeconds },
    });
    return redirect303(request, "/reset-password?error=rate_limited");
  }

  const formData = await request.formData();
  const payload = resetPasswordInputSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });

  if (!payload.success) {
    return redirect303(request, "/reset-password?error=invalid_input");
  }

  try {
    const result = await resetPasswordByToken(payload.data.token, payload.data.password);
    if (!result.ok) {
      return redirect303(request, "/reset-password?error=invalid_token");
    }

    return redirect303(request, result.redirectTo);
  } catch (error) {
    trackError("api.auth.reset-password", error, { ip: clientIp });
    return redirect303(request, "/reset-password?error=reset_failed");
  }
}
