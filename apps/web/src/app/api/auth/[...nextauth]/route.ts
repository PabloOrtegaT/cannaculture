import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { getAuthOptions } from "@/server/auth/options";
import { enforceRateLimit, getClientIpFromRequest } from "@/server/security/rate-limit";

const handler = async (request: Request, context: unknown) => {
  if (request.method === "POST") {
    const clientIp = getClientIpFromRequest(request);
    const rateLimit = await enforceRateLimit({
      key: `auth:nextauth:post:${clientIp}`,
      maxRequests: 20,
      windowMs: 60_000,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many authentication attempts. Please wait and try again." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }
  }

  const options = getAuthOptions();
  return NextAuth(options)(request, context);
};

export { handler as GET, handler as POST };
