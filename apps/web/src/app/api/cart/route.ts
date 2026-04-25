import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import {
  getUserCartSnapshot,
  mergeGuestCartIntoUserCart,
  reconcileCartState,
  replaceUserCart,
} from "@/server/cart/service";
import { trackError } from "@/server/observability/telemetry";
import { enforceRateLimit, getClientIpFromRequest } from "@/server/security/rate-limit";
import { cartWritePayloadSchema, normalizeParsedCartState } from "@/server/cart/validation";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientIp = getClientIpFromRequest(request);
  const rateLimit = await enforceRateLimit({
    key: `cart:read:${user.id}:${clientIp}`,
    maxRequests: 60,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait and try again." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  const snapshot = await getUserCartSnapshot(user.id);
  return NextResponse.json(snapshot);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientIp = getClientIpFromRequest(request);
  const rateLimit = await enforceRateLimit({
    key: `cart:write:${user.id}:${clientIp}`,
    maxRequests: 40,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many cart updates. Please wait and try again." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = cartWritePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid cart payload." }, { status: 400 });
  }

  const requestedCart = normalizeParsedCartState(parsed.data.cart);
  const isMerge = parsed.data.merge === true;

  try {
    if (isMerge) {
      const result = await mergeGuestCartIntoUserCart(user.id, requestedCart);
      return NextResponse.json(result);
    }

    const reconciled = await reconcileCartState(requestedCart);
    const replaceResult = await replaceUserCart(user.id, reconciled.cart);

    return NextResponse.json({
      cart: reconciled.cart,
      summary: reconciled.summary,
      version: replaceResult.version,
    });
  } catch (error) {
    trackError("api.cart.post", error, { userId: user.id });
    return NextResponse.json({ error: "Could not update cart." }, { status: 500 });
  }
}
