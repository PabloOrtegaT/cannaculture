import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { buildAbsoluteUrl } from "@/server/config/host-policy";
import {
  getHostRuntimeConfig,
  getPaymentProviderFlags,
  getPaymentRuntimeConfig,
} from "@/server/config/runtime-env";
import type {
  CheckoutPaymentSession,
  CheckoutProvider,
  CheckoutSessionCreateInput,
  PaymentProviderId,
  PaymentWebhookEvent,
} from "@/server/orders/types";

export type PaymentProviderAdapter = {
  id: PaymentProviderId;
  method: CheckoutProvider;
  displayName: string;
  createCheckoutSession: (input: CheckoutSessionCreateInput) => Promise<CheckoutPaymentSession>;
  parseWebhookEvent: (request: Request) => Promise<PaymentWebhookEvent>;
};

const mockWebhookSchema = z.object({
  eventId: z.string().min(1),
  eventType: z.string().min(1),
  occurredAt: z.string().datetime().optional(),
  orderId: z.string().min(1).optional(),
  providerSessionId: z.string().min(1).optional(),
  paymentReference: z.string().min(1).optional(),
  outcome: z.enum(["succeeded", "failed", "cancelled", "pending"]),
});

function jsonRequestInit(payload: unknown) {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  } satisfies RequestInit;
}

function currentAppBaseUrl() {
  return getHostRuntimeConfig().appBaseUrl;
}

function equalSignature(expected: string, actual: string) {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, actualBuffer);
}

function parseMpSignature(signatureHeader: string) {
  const parts = signatureHeader.split(",").map((p) => p.trim());
  const tsPart = parts.find((p) => p.startsWith("ts="));
  const v1Part = parts.find((p) => p.startsWith("v1="));
  if (!tsPart || !v1Part) return null;
  return {
    ts: tsPart.slice(3),
    v1: v1Part.slice(3),
  };
}

function hmacSha256Hex(secret: string, message: string): string {
  return createHmac("sha256", secret).update(message).digest("hex");
}

function parseStripeSignatureHeader(signatureHeader: string) {
  const entries = signatureHeader.split(",").map((segment) => segment.trim());
  const timestamp = entries.find((entry) => entry.startsWith("t="))?.slice(2);
  const signatures = entries
    .filter((entry) => entry.startsWith("v1="))
    .map((entry) => entry.slice(3))
    .filter(Boolean);
  return {
    timestamp,
    signatures,
  };
}

function verifyStripeSignature(payload: string, signatureHeader: string, webhookSecret: string) {
  const parsed = parseStripeSignatureHeader(signatureHeader);
  if (!parsed.timestamp || parsed.signatures.length === 0) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  const ts = Number.parseInt(parsed.timestamp, 10);
  if (Number.isNaN(ts) || Math.abs(now - ts) > 5 * 60) {
    return false;
  }

  const signedPayload = `${parsed.timestamp}.${payload}`;
  const expected = createHmac("sha256", webhookSecret).update(signedPayload).digest("hex");
  return parsed.signatures.some((signature) => equalSignature(expected, signature));
}

function createMockProvider(method: CheckoutProvider, id: PaymentProviderId, displayName: string): PaymentProviderAdapter {
  return {
    id,
    method,
    displayName,
    async createCheckoutSession(input) {
      const sessionId = `mock_${crypto.randomUUID()}`;
      const checkoutUrl = buildAbsoluteUrl(
        currentAppBaseUrl(),
        "/checkout/mock",
        `?session=${encodeURIComponent(sessionId)}&order=${encodeURIComponent(input.orderId)}&provider=${encodeURIComponent(method)}`,
      );

      return {
        providerId: id,
        sessionId,
        checkoutUrl,
      };
    },
    async parseWebhookEvent(request) {
      const config = getPaymentRuntimeConfig();
      const signature = request.headers.get("x-mock-webhook-signature");
      if (config.mockWebhookSecret && (!signature || !equalSignature(config.mockWebhookSecret, signature))) {
        throw new Error("Invalid mock webhook signature.");
      }

      const payloadText = await request.text();
      const payload = mockWebhookSchema.parse(JSON.parse(payloadText));
      return {
        providerId: id,
        eventId: payload.eventId,
        eventType: payload.eventType,
        occurredAt: payload.occurredAt ? new Date(payload.occurredAt) : new Date(),
        ...(payload.orderId ? { orderId: payload.orderId } : {}),
        ...(payload.providerSessionId ? { providerSessionId: payload.providerSessionId } : {}),
        ...(payload.paymentReference ? { paymentReference: payload.paymentReference } : {}),
        outcome: payload.outcome,
        payload: payloadText,
      };
    },
  };
}

function currencyToStripeCode(currency: "MXN" | "USD") {
  return currency.toLowerCase();
}

function createStripeProvider(stripeSecretKey: string): PaymentProviderAdapter {
  return {
    id: "stripe",
    method: "card",
    displayName: "Stripe (Card)",
    async createCheckoutSession(input) {
      const body = new URLSearchParams();
      body.set("mode", "payment");
      body.set("success_url", input.successUrl);
      body.set("cancel_url", input.cancelUrl);
      body.set("client_reference_id", input.orderId);
      body.set("metadata[orderId]", input.orderId);
      body.set("metadata[orderNumber]", input.orderNumber);
      body.set("payment_method_types[0]", "card");
      body.set("line_items[0][price_data][currency]", currencyToStripeCode(input.totals.currency));
      body.set("line_items[0][price_data][unit_amount]", String(input.totals.totalCents));
      body.set("line_items[0][price_data][product_data][name]", `Order ${input.orderNumber}`);
      body.set("line_items[0][quantity]", "1");
      body.set("customer_email", input.customerEmail);

      const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Stripe checkout session creation failed: ${errorText}`);
      }

      const payload = (await response.json()) as {
        id: string;
        url: string;
        expires_at?: number;
      };

      return {
        providerId: "stripe",
        sessionId: payload.id,
        checkoutUrl: payload.url,
        ...(typeof payload.expires_at === "number"
          ? { expiresAt: new Date(payload.expires_at * 1000) }
          : {}),
      };
    },
    async parseWebhookEvent(request) {
      const config = getPaymentRuntimeConfig();
      const signature = request.headers.get("stripe-signature");
      const payload = await request.text();
      if (!signature || !config.stripeWebhookSecret) {
        throw new Error("Stripe webhook secret/signature missing.");
      }
      if (!verifyStripeSignature(payload, signature, config.stripeWebhookSecret)) {
        throw new Error("Invalid Stripe webhook signature.");
      }

      const parsed = JSON.parse(payload) as {
        id?: string;
        type?: string;
        created?: number;
        data?: {
          object?: {
            id?: string;
            client_reference_id?: string;
            payment_intent?: string;
            metadata?: Record<string, string | undefined>;
          };
        };
      };

      const eventType = parsed.type ?? "unknown";
      const object = parsed.data?.object;
      const outcome =
        eventType === "checkout.session.completed" || eventType === "payment_intent.succeeded"
          ? "succeeded"
          : eventType === "checkout.session.expired"
            ? "cancelled"
            : eventType.includes("failed")
              ? "failed"
              : "pending";

      return {
        providerId: "stripe",
        eventId: parsed.id ?? `stripe_${crypto.randomUUID()}`,
        eventType,
        occurredAt: typeof parsed.created === "number" ? new Date(parsed.created * 1000) : new Date(),
        ...(object?.metadata?.orderId || object?.client_reference_id
          ? { orderId: object?.metadata?.orderId ?? object?.client_reference_id }
          : {}),
        ...(object?.id ? { providerSessionId: object.id } : {}),
        ...(object?.payment_intent ? { paymentReference: object.payment_intent } : {}),
        outcome,
        payload,
      };
    },
  };
}

function currencyToMercadoPagoCode(currency: "MXN" | "USD") {
  return currency;
}

function createMercadoPagoProvider(accessToken: string): PaymentProviderAdapter {
  return {
    id: "mercadopago",
    method: "mercadopago",
    displayName: "Mercado Pago",
    async createCheckoutSession(input) {
      const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
        ...jsonRequestInit({
          items: [
            {
              title: `Order ${input.orderNumber}`,
              quantity: 1,
              unit_price: input.totals.totalCents / 100,
              currency_id: currencyToMercadoPagoCode(input.totals.currency),
            },
          ],
          external_reference: input.orderId,
          metadata: {
            orderId: input.orderId,
            orderNumber: input.orderNumber,
          },
          back_urls: {
            success: input.successUrl,
            failure: input.cancelUrl,
            pending: input.cancelUrl,
          },
          auto_return: "approved",
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Mercado Pago checkout session creation failed: ${errorText}`);
      }

      const payload = (await response.json()) as {
        id: string;
        init_point?: string;
        sandbox_init_point?: string;
        expires?: boolean;
      };

      const checkoutUrl = payload.init_point ?? payload.sandbox_init_point;
      if (!checkoutUrl) {
        throw new Error("Mercado Pago response did not include checkout URL.");
      }

      return {
        providerId: "mercadopago",
        sessionId: payload.id,
        checkoutUrl,
      };
    },
    async parseWebhookEvent(request) {
      const config = getPaymentRuntimeConfig();
      const signatureHeader = request.headers.get("x-mercadopago-signature");
      const requestId = request.headers.get("x-request-id") ?? "";
      const payload = await request.text();

      if (!signatureHeader || !config.mercadoPagoWebhookSecret) {
        throw new Error("Mercado Pago webhook secret or signature missing.");
      }

      const parsed = JSON.parse(payload) as {
        id?: string | number;
        type?: string;
        action?: string;
        date_created?: string;
        data?: {
          id?: string;
          metadata?: {
            orderId?: string;
          };
          external_reference?: string;
        };
      };

      // F4-3: Real HMAC verification. MP signs the "manifest" with the webhook secret.
      const sigParsed = parseMpSignature(signatureHeader);
      if (!sigParsed) {
        throw new Error("Invalid Mercado Pago signature format.");
      }

      const dataId = String(parsed.data?.id ?? parsed.id ?? "");
      const manifest = requestId
        ? `id:${dataId};request-id:${requestId}`
        : `id:${dataId}`;
      const expected = hmacSha256Hex(config.mercadoPagoWebhookSecret, manifest);
      if (!equalSignature(expected, sigParsed.v1)) {
        throw new Error("Invalid Mercado Pago webhook signature.");
      }

      // Reject replays older than 5 minutes.
      const nowMs = Date.now();
      if (Math.abs(nowMs - Number(sigParsed.ts) * 1000) > 5 * 60 * 1000) {
        throw new Error("Mercado Pago signature timestamp out of tolerance.");
      }

      const eventType = parsed.type ?? parsed.action ?? "unknown";
      const outcome = eventType.includes("approved")
        ? "succeeded"
        : eventType.includes("rejected") || eventType.includes("failed")
          ? "failed"
          : eventType.includes("cancel")
            ? "cancelled"
            : "pending";

      return {
        providerId: "mercadopago",
        eventId: String(parsed.id ?? `mercadopago_${crypto.randomUUID()}`),
        eventType,
        occurredAt: parsed.date_created ? new Date(parsed.date_created) : new Date(),
        ...(parsed.data?.metadata?.orderId || parsed.data?.external_reference
          ? { orderId: parsed.data?.metadata?.orderId ?? parsed.data?.external_reference }
          : {}),
        ...(parsed.data?.id ? { providerSessionId: parsed.data.id } : {}),
        outcome,
        payload,
      };
    },
  };
}

export function resolvePaymentProvider(method: CheckoutProvider): PaymentProviderAdapter {
  const config = getPaymentRuntimeConfig();

  if (method === "card") {
    if (config.stripeSecretKey) {
      return createStripeProvider(config.stripeSecretKey);
    }
    return createMockProvider("card", "mock-card", "Mock Card Checkout");
  }

  if (method === "mercadopago") {
    if (config.mercadoPagoAccessToken) {
      return createMercadoPagoProvider(config.mercadoPagoAccessToken);
    }
    return createMockProvider("mercadopago", "mock-mercadopago", "Mock Mercado Pago Checkout");
  }

  throw new Error(`Unsupported payment provider "${method}".`);
}

export function resolveProviderFromWebhookRoute(provider: string): PaymentProviderAdapter {
  if (provider === "stripe") {
    const config = getPaymentRuntimeConfig();
    if (!config.stripeSecretKey) {
      throw new Error("Stripe webhook route is disabled because STRIPE_SECRET_KEY is not configured.");
    }
    return createStripeProvider(config.stripeSecretKey);
  }
  if (provider === "mercadopago") {
    const config = getPaymentRuntimeConfig();
    if (!config.mercadoPagoAccessToken) {
      throw new Error("Mercado Pago webhook route is disabled because MERCADOPAGO_ACCESS_TOKEN is not configured.");
    }
    return createMercadoPagoProvider(config.mercadoPagoAccessToken);
  }
  if (provider === "mock-card") {
    return createMockProvider("card", "mock-card", "Mock Card Checkout");
  }
  if (provider === "mock-mercadopago") {
    return createMockProvider("mercadopago", "mock-mercadopago", "Mock Mercado Pago Checkout");
  }

  throw new Error(`Unsupported payment provider "${provider}".`);
}

export function listCheckoutProviderOptions() {
  const flags = getPaymentProviderFlags();
  return [
    {
      method: "card" as const,
      label: "Card (Primary)",
      activeProvider: flags.stripeEnabled ? "stripe" : "mock-card",
      mode: flags.stripeEnabled ? "live" : "mock",
    },
    {
      method: "mercadopago" as const,
      label: "Mercado Pago (Other payment forms)",
      activeProvider: flags.mercadoPagoEnabled ? "mercadopago" : "mock-mercadopago",
      mode: flags.mercadoPagoEnabled ? "live" : "mock",
    },

  ];
}
