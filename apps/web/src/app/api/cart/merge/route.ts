import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { mergeGuestCartIntoUserCart } from "@/server/cart/service";
import { trackError } from "@/server/observability/telemetry";
import { enforceRateLimit, getClientIpFromRequest } from "@/server/security/rate-limit";
import { cartStateSchema, normalizeParsedCartState } from "@/server/cart/validation";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientIp = getClientIpFromRequest(request);
  const rateLimit = enforceRateLimit({
    key: `cart:merge:${user.id}:${clientIp}`,
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many cart merge attempts. Please try again in a moment." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = cartStateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid cart payload." }, { status: 400 });
  }

  const guestCart = normalizeParsedCartState(parsed.data);

  try {
    const result = await mergeGuestCartIntoUserCart(user.id, guestCart);
    return NextResponse.json(result);
  } catch (error) {
    trackError("api.cart.merge", error, { userId: user.id });
    return NextResponse.json({ error: "Could not merge cart." }, { status: 500 });
  }
}
