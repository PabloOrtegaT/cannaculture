import { NextResponse } from "next/server";
import { PRIVATE_NO_STORE } from "@/server/http/cache-headers";
import { resolveProviderFromWebhookRoute } from "@/server/payments/provider";
import { processPaymentWebhookEvent } from "@/server/payments/webhook-service";
import { trackError, trackWarn } from "@/server/observability/telemetry";
import { enforceRateLimit, getClientIpFromRequest } from "@/server/security/rate-limit";

type WebhookRouteContext = {
  params: Promise<{
    provider: string;
  }>;
};

export async function POST(request: Request, context: WebhookRouteContext) {
  const params = await context.params;
  const clientIp = getClientIpFromRequest(request);
  const rateLimit = await enforceRateLimit({
    key: `webhook:${params.provider}:${clientIp}`,
    maxRequests: 100,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    trackWarn({
      scope: "api.payments.webhook.post",
      message: "rate_limited",
      metadata: {
        provider: params.provider,
        ip: clientIp,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
    });
    return NextResponse.json(
      { error: "Rate limited." },
      { status: 429, headers: PRIVATE_NO_STORE },
    );
  }

  let event;
  try {
    const provider = resolveProviderFromWebhookRoute(params.provider);
    event = await provider.parseWebhookEvent(request);
  } catch (error) {
    trackError("api.payments.webhook.post", error, {
      provider: params.provider,
    });
    return NextResponse.json(
      { error: "Invalid payment webhook event." },
      { status: 400, headers: PRIVATE_NO_STORE },
    );
  }

  try {
    const result = await processPaymentWebhookEvent(event);

    if (result.kind === "duplicate") {
      return NextResponse.json(
        {
          received: true,
          idempotent: true,
          eventId: result.eventId,
        },
        { headers: PRIVATE_NO_STORE },
      );
    }

    return NextResponse.json(
      {
        received: true,
        idempotent: false,
        eventId: result.eventId,
        orderId: result.orderId,
        outcome: result.outcome,
      },
      { headers: PRIVATE_NO_STORE },
    );
  } catch (error) {
    trackError("api.payments.webhook.post", error, {
      provider: params.provider,
    });
    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500, headers: PRIVATE_NO_STORE },
    );
  }
}
