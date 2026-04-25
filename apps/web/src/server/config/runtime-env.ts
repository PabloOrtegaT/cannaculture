import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";

function parseOptionalPositiveInt(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
}

function parseOptionalBoolean(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function parseOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  return trimmed;
}

function isValidResendFromEmail(value: string) {
  if (z.string().email().safeParse(value).success) {
    return true;
  }

  const match = value.match(/<([^<>]+)>$/);
  if (!match) {
    return false;
  }

  const extractedEmail = match[1];
  if (!extractedEmail) {
    return false;
  }

  return z.string().email().safeParse(extractedEmail.trim()).success;
}

const runtimeEnvSchema = z.object({
  AUTH_SECRET: z.preprocess(parseOptionalString, z.string().min(16).optional()),
  AUTH_REFRESH_TOKEN_SECRET: z.preprocess(parseOptionalString, z.string().min(16).optional()),
  AUTH_ADMIN_REFRESH_TOKEN_SECRET: z.preprocess(parseOptionalString, z.string().min(16).optional()),
  APP_BASE_URL: z.preprocess(parseOptionalString, z.string().url().optional()),
  ADMIN_BASE_URL: z.preprocess(parseOptionalString, z.string().url().optional()),
  AUTH_ACCESS_TTL_SECONDS: z.preprocess(
    parseOptionalPositiveInt,
    z.number().int().positive().optional(),
  ),
  AUTH_REFRESH_IDLE_DAYS: z.preprocess(
    parseOptionalPositiveInt,
    z.number().int().positive().optional(),
  ),
  AUTH_REFRESH_ABSOLUTE_DAYS: z.preprocess(
    parseOptionalPositiveInt,
    z.number().int().positive().optional(),
  ),
  AUTH_ADMIN_REFRESH_IDLE_HOURS: z.preprocess(
    parseOptionalPositiveInt,
    z.number().int().positive().optional(),
  ),
  AUTH_ADMIN_REFRESH_ABSOLUTE_DAYS: z.preprocess(
    parseOptionalPositiveInt,
    z.number().int().positive().optional(),
  ),
  ADMIN_REQUIRE_CF_ACCESS: z.preprocess(parseOptionalBoolean, z.boolean().optional()),
  RESEND_API_KEY: z.preprocess(parseOptionalString, z.string().min(1).optional()),
  RESEND_FROM_EMAIL: z.preprocess(
    parseOptionalString,
    z.string().refine(isValidResendFromEmail, "Invalid email address").optional(),
  ),
  GOOGLE_CLIENT_ID: z.preprocess(parseOptionalString, z.string().min(1).optional()),
  GOOGLE_CLIENT_SECRET: z.preprocess(parseOptionalString, z.string().min(1).optional()),
  FACEBOOK_CLIENT_ID: z.preprocess(parseOptionalString, z.string().min(1).optional()),
  FACEBOOK_CLIENT_SECRET: z.preprocess(parseOptionalString, z.string().min(1).optional()),
  STRIPE_SECRET_KEY: z.preprocess(parseOptionalString, z.string().min(1).optional()),
  STRIPE_WEBHOOK_SECRET: z.preprocess(parseOptionalString, z.string().min(1).optional()),
  MERCADOPAGO_ACCESS_TOKEN: z.preprocess(parseOptionalString, z.string().min(1).optional()),
  MERCADOPAGO_WEBHOOK_SECRET: z.preprocess(parseOptionalString, z.string().min(1).optional()),
  MOCK_PAYMENT_WEBHOOK_SECRET: z.preprocess(parseOptionalString, z.string().min(1).optional()),
  INVENTORY_SWEEPER_TOKEN: z.preprocess(parseOptionalString, z.string().min(1).optional()),
  AUTH_REFRESH_SWEEP_TOKEN: z.preprocess(parseOptionalString, z.string().min(1).optional()),
});

export type RuntimeEnv = z.infer<typeof runtimeEnvSchema>;

type MaybeCloudflareEnv = Record<string, string | undefined> & {
  DB?: unknown;
};

export function getRuntimeEnvironment(): RuntimeEnv {
  const raw = readRawEnvironment();
  return runtimeEnvSchema.parse(raw);
}

export function getAuthRuntimeConfig() {
  const env = getRuntimeEnvironment();
  const isDev = process.env.NODE_ENV === "development" || process.env.NEXTJS_ENV === "development";
  const refreshTokenSecret =
    env.AUTH_REFRESH_TOKEN_SECRET ??
    env.AUTH_SECRET ??
    (isDev ? "dev-refresh-secret-change-me" : undefined);
  if (!refreshTokenSecret) {
    throw new Error("AUTH_REFRESH_TOKEN_SECRET is required in production.");
  }

  const adminRefreshTokenSecret =
    env.AUTH_ADMIN_REFRESH_TOKEN_SECRET ?? env.AUTH_REFRESH_TOKEN_SECRET ?? env.AUTH_SECRET;
  if (!env.AUTH_ADMIN_REFRESH_TOKEN_SECRET && !isDev) {
    console.warn(
      "AUTH_ADMIN_REFRESH_TOKEN_SECRET is not set. Falling back to AUTH_REFRESH_TOKEN_SECRET. " +
        "Set a separate admin refresh token secret for improved security.",
    );
  }
  if (!adminRefreshTokenSecret) {
    throw new Error("AUTH_ADMIN_REFRESH_TOKEN_SECRET or AUTH_REFRESH_TOKEN_SECRET is required in production.");
  }

  return {
    accessTtlSeconds: env.AUTH_ACCESS_TTL_SECONDS ?? 60 * 15,
    refreshIdleDays: env.AUTH_REFRESH_IDLE_DAYS ?? 30,
    refreshAbsoluteDays: env.AUTH_REFRESH_ABSOLUTE_DAYS ?? 180,
    adminRefreshIdleHours: env.AUTH_ADMIN_REFRESH_IDLE_HOURS ?? 8,
    adminRefreshAbsoluteDays: env.AUTH_ADMIN_REFRESH_ABSOLUTE_DAYS ?? 7,
    refreshTokenSecret,
    adminRefreshTokenSecret,
  };
}

export function getHostRuntimeConfig() {
  const isDev = process.env.NODE_ENV === "development" || process.env.NEXTJS_ENV === "development";
  const env = getRuntimeEnvironment();

  // In development, only use APP_BASE_URL/ADMIN_BASE_URL if they were set
  // explicitly by the developer in process.env (via .env.local or .dev.vars),
  // not when they leak from the wrangler.jsonc vars section through the
  // Cloudflare context. The wrangler vars contain production URLs that must
  // not be used in local development.
  const explicitAppBaseUrl = process.env.APP_BASE_URL;
  const explicitAdminBaseUrl = process.env.ADMIN_BASE_URL;

  const appBaseUrl = isDev
    ? (explicitAppBaseUrl ?? "http://127.0.0.1:3000")
    : (env.APP_BASE_URL ?? "http://127.0.0.1:3000");
  const adminBaseUrl = isDev
    ? (explicitAdminBaseUrl ?? appBaseUrl)
    : (env.ADMIN_BASE_URL ?? appBaseUrl);

  return {
    appBaseUrl,
    adminBaseUrl,
    adminRequireCfAccess: Boolean(env.ADMIN_REQUIRE_CF_ACCESS),
  };
}

export function getOAuthProviderFlags() {
  const env = getRuntimeEnvironment();
  return {
    googleEnabled: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    facebookEnabled: Boolean(env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET),
  };
}

export function getPaymentProviderFlags() {
  const env = getRuntimeEnvironment();
  return {
    stripeEnabled: Boolean(env.STRIPE_SECRET_KEY),
    mercadoPagoEnabled: Boolean(env.MERCADOPAGO_ACCESS_TOKEN),
  };
}

export function getPaymentRuntimeConfig() {
  const env = getRuntimeEnvironment();
  return {
    stripeSecretKey: env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
    mercadoPagoAccessToken: env.MERCADOPAGO_ACCESS_TOKEN,
    mercadoPagoWebhookSecret: env.MERCADOPAGO_WEBHOOK_SECRET,
    mockWebhookSecret: env.MOCK_PAYMENT_WEBHOOK_SECRET,
  };
}

export function getInventoryRuntimeConfig() {
  const env = getRuntimeEnvironment();
  return {
    sweeperToken: env.INVENTORY_SWEEPER_TOKEN,
  };
}

export function getAuthSweepRuntimeConfig() {
  const env = getRuntimeEnvironment();
  return {
    sweeperToken: env.AUTH_REFRESH_SWEEP_TOKEN,
  };
}

export function getDatabaseBinding() {
  const raw = readRawEnvironment();
  const binding = raw.DB;
  if (!binding) {
    throw new Error(
      'Cloudflare D1 binding "DB" is not available. Run migrations and ensure wrangler D1 binding is configured.',
    );
  }
  return binding;
}

function readRawEnvironment(): MaybeCloudflareEnv {
  const processEnv = process.env as MaybeCloudflareEnv;
  try {
    const context = getCloudflareContext();
    return {
      ...(context.env as unknown as MaybeCloudflareEnv),
      ...processEnv,
    };
  } catch {
    return processEnv;
  }
}
