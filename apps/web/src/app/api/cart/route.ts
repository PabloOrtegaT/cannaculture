import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { emptyCartMergeSummary } from "@/features/cart/merge-summary";
import {
  getUserCartSnapshot,
  reconcileCartStateAgainstServer,
  replaceUserCart,
} from "@/server/cart/service";
import { trackError, trackWarn } from "@/server/observability/telemetry";
import { enforceRateLimit, getClientIpFromRequest } from "@/server/security/rate-limit";
import { cartWritePayloadSchema, normalizeCartWritePayload } from "@/server/cart/validation";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  const rateLimit = enforceRateLimit({
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

  const parsedPayload = normalizeCartWritePayload(parsed.data);
  const requestedCart = parsedPayload.cart;
  const expectedVersion = parsedPayload.version;

  try {
    const currentSnapshot = await getUserCartSnapshot(user.id);
    if (typeof expectedVersion === "number" && expectedVersion !== currentSnapshot.version) {
      return NextResponse.json(
        {
          error: "Version conflict.",
          ...currentSnapshot,
          summary: emptyCartMergeSummary,
        },
        { status: 409 },
      );
    }

    const reconciled = await reconcileCartStateAgainstServer({
      requestedCart,
      serverCart: currentSnapshot.cart,
    });
    const replaceResult = await replaceUserCart(user.id, reconciled.cart, {
      expectedVersion: currentSnapshot.version,
    });

    if (!replaceResult.ok) {
      trackWarn({
        scope: "api.cart.post",
        message: "version_conflict_after_reconcile",
        metadata: { userId: user.id },
      });
      return NextResponse.json(
        {
          error: "Version conflict.",
          ...replaceResult.snapshot,
          summary: reconciled.summary,
        },
        { status: 409 },
      );
    }

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
