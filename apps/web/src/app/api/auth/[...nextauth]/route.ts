import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { getAuthOptions } from "@/server/auth/options";
import { PRIVATE_NO_STORE } from "@/server/http/cache-headers";
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
            ...PRIVATE_NO_STORE,
          },
        },
      );
    }
  }

  const options = getAuthOptions();
  const response = await NextAuth(options)(request, context);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
};

export { handler as GET, handler as POST };
