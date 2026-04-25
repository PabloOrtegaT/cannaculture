import { NextResponse } from "next/server";
import { trackError, trackWarn } from "@/server/observability/telemetry";
import {
  enforceRateLimit,
  getClientIpFromRequest,
  hashEmailForRateLimit,
} from "@/server/security/rate-limit";
import { requestPasswordReset } from "@/server/auth/service";
import { forgotPasswordInputSchema } from "@/server/auth/validation";

function redirect303(request: Request, pathname: string) {
  return NextResponse.redirect(new URL(pathname, request.url), { status: 303 });
}

export async function POST(request: Request) {
  const clientIp = getClientIpFromRequest(request);

  // Rate limit by IP
  const ipRateLimit = await enforceRateLimit({
    key: `auth:forgot-password:${clientIp}`,
    maxRequests: 12,
    windowMs: 60_000,
  });
  if (!ipRateLimit.allowed) {
    trackWarn({
      scope: "api.auth.forgot-password",
      message: "rate_limited",
      metadata: { ip: clientIp, retryAfterSeconds: ipRateLimit.retryAfterSeconds },
    });
    return redirect303(request, "/forgot-password?error=rate_limited");
  }

  const requestOrigin = new URL(request.url).origin;
  const formData = await request.formData();
  const payload = forgotPasswordInputSchema.safeParse({
    email: formData.get("email"),
  });

  if (!payload.success) {
    return redirect303(request, "/forgot-password?error=invalid_input");
  }

  // Rate limit by email (prevents enumeration with rotating IPs)
  const emailHash = hashEmailForRateLimit(payload.data.email);
  const emailRateLimit = await enforceRateLimit({
    key: `auth:forgot-password:email:${emailHash}`,
    maxRequests: 5,
    windowMs: 60_000,
  });
  if (!emailRateLimit.allowed) {
    trackWarn({
      scope: "api.auth.forgot-password",
      message: "rate_limited_email",
      metadata: { ip: clientIp, retryAfterSeconds: emailRateLimit.retryAfterSeconds },
    });
    return redirect303(request, "/forgot-password?error=rate_limited");
  }

  try {
    await requestPasswordReset(payload.data.email, requestOrigin);
    return redirect303(request, "/forgot-password?sent=1");
  } catch (error) {
    trackError("api.auth.forgot-password", error, { ip: clientIp });
    return redirect303(request, "/forgot-password?error=request_failed");
  }
}
