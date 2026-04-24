import { z } from "zod";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { getOrderById } from "@/server/orders/service";
import { processPaymentWebhookEvent } from "@/server/payments/webhook-service";
import { enforceRateLimit, getClientIpFromRequest } from "@/server/security/rate-limit";

const mockCompletePayloadSchema = z.object({
  orderId: z.string().uuid(),
  providerSessionId: z.string().min(1),
  providerId: z.enum(["mock-card", "mock-mercadopago"]).default("mock-card"),
  outcome: z.enum(["succeeded", "failed", "cancelled"]),
});

export async function POST(request: Request) {
  // F4-4: This route exists only for local dev / E2E. Refuse in production.
  const isDev = process.env.NODE_ENV === "development" || process.env.NEXTJS_ENV === "development";
  if (!isDev) {
    return new NextResponse("Not found", { status: 404 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientIp = getClientIpFromRequest(request);
  const rateLimit = enforceRateLimit({
    key: `payments:mock-complete:${user.id}:${clientIp}`,
    maxRequests: 5,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limited." }, { status: 429 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = mockCompletePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const order = await getOrderById(parsed.data.orderId);
  if (!order || order.userId !== user.id) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  if (order.status !== "pending_payment") {
    return NextResponse.json({ error: "Order is not awaiting payment." }, { status: 409 });
  }

  const eventId = `mock_${parsed.data.providerSessionId}_${parsed.data.outcome}`;
  const eventType = `mock.checkout.${parsed.data.outcome}`;
  const result = await processPaymentWebhookEvent({
    providerId: parsed.data.providerId,
    eventId,
    eventType,
    occurredAt: new Date(),
    orderId: parsed.data.orderId,
    providerSessionId: parsed.data.providerSessionId,
    outcome: parsed.data.outcome,
    payload: JSON.stringify({
      eventId,
      eventType,
      orderId: parsed.data.orderId,
      providerSessionId: parsed.data.providerSessionId,
      outcome: parsed.data.outcome,
    }),
  });

  return NextResponse.json({
    received: true,
    result,
  });
}
