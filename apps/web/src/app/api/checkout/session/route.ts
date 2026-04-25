import { ZodError } from "zod";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { PRIVATE_NO_STORE } from "@/server/http/cache-headers";
import {
  CheckoutCouponError,
  CheckoutStockConflictError,
  createCheckoutSessionForUser,
  parseCheckoutRequest,
} from "@/server/payments/checkout-service";
import { listCheckoutProviderOptions } from "@/server/payments/provider";
import { trackError } from "@/server/observability/telemetry";
import { enforceRateLimit, getClientIpFromRequest } from "@/server/security/rate-limit";

function readErrorText(error: unknown): string {
  if (!(error instanceof Error)) {
    return "";
  }

  const parts = [error.message];
  let current: unknown = error;
  let depth = 0;

  while (current instanceof Error && current.cause && depth < 4) {
    current = current.cause;
    if (current instanceof Error) {
      parts.push(current.message);
    } else if (typeof current === "string") {
      parts.push(current);
      break;
    } else {
      break;
    }
    depth += 1;
  }

  return parts.join(" | ");
}

export async function GET(request: Request) {
  const clientIp = getClientIpFromRequest(request);
  const rateLimit = await enforceRateLimit({
    key: `checkout:options:${clientIp}`,
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait and try again." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
          ...PRIVATE_NO_STORE,
        },
      },
    );
  }

  return NextResponse.json(
    {
      providers: listCheckoutProviderOptions(),
    },
    { headers: PRIVATE_NO_STORE },
  );
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: PRIVATE_NO_STORE },
    );
  }
  if (!user.emailVerified) {
    return NextResponse.json(
      { error: "Please verify your email before starting checkout." },
      { status: 403, headers: PRIVATE_NO_STORE },
    );
  }

  const clientIp = getClientIpFromRequest(request);
  const rateLimit = await enforceRateLimit({
    key: `checkout:create:${user.id}:${clientIp}`,
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many checkout attempts. Please wait and try again." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
          ...PRIVATE_NO_STORE,
        },
      },
    );
  }

  const payload = await request.json().catch(() => null);
  try {
    const parsed = parseCheckoutRequest(payload);
    const result = await createCheckoutSessionForUser({
      userId: user.id,
      customerEmail: user.email,
      provider: parsed.provider,
      ...(parsed.couponCode ? { couponCode: parsed.couponCode } : {}),
      ...(parsed.successPath ? { successPath: parsed.successPath } : {}),
      ...(parsed.cancelPath ? { cancelPath: parsed.cancelPath } : {}),
    });

    return NextResponse.json(result, { headers: PRIVATE_NO_STORE });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid checkout payload." },
        { status: 400, headers: PRIVATE_NO_STORE },
      );
    }
    if (error instanceof Error) {
      if (error instanceof CheckoutCouponError) {
        return NextResponse.json(
          {
            error: error.message,
            code: error.code,
          },
          { status: 400, headers: PRIVATE_NO_STORE },
        );
      }
      if (error instanceof CheckoutStockConflictError) {
        return NextResponse.json(
          {
            error: "One or more products no longer have enough stock.",
            code: error.code,
            lines: error.lines,
          },
          { status: 409, headers: PRIVATE_NO_STORE },
        );
      }
      if (
        error.message === "Cart is empty." ||
        error.message === "Cart contains unavailable items." ||
        error.message === "Cart has no purchasable items."
      ) {
        return NextResponse.json(
          { error: error.message },
          { status: 400, headers: PRIVATE_NO_STORE },
        );
      }

      const details = readErrorText(error).toLowerCase();
      if (details.includes("no such table: order")) {
        return NextResponse.json(
          {
            error: "Orders schema is missing. Run `npm run db:migrate:local` and retry checkout.",
          },
          { status: 500, headers: PRIVATE_NO_STORE },
        );
      }
      if (details.includes("foreign key constraint failed")) {
        return NextResponse.json(
          { error: "Your session is stale. Please sign out and sign in again." },
          { status: 401, headers: PRIVATE_NO_STORE },
        );
      }
    }
    trackError("api.checkout.session.post", error, { userId: user.id });
    return NextResponse.json(
      { error: "Could not create checkout session." },
      { status: 500, headers: PRIVATE_NO_STORE },
    );
  }
}
