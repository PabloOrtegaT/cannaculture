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

const runtimeEnvSchema = z.object({
  AUTH_SECRET: z.string().min(16).optional(),
  AUTH_REFRESH_TOKEN_SECRET: z.string().min(16).optional(),
  APP_BASE_URL: z.string().url().optional(),
  ADMIN_BASE_URL: z.string().url().optional(),
  AUTH_ACCESS_TTL_SECONDS: z.preprocess(parseOptionalPositiveInt, z.number().int().positive().optional()),
  AUTH_REFRESH_IDLE_DAYS: z.preprocess(parseOptionalPositiveInt, z.number().int().positive().optional()),
  AUTH_REFRESH_ABSOLUTE_DAYS: z.preprocess(parseOptionalPositiveInt, z.number().int().positive().optional()),
  AUTH_ADMIN_REFRESH_IDLE_HOURS: z.preprocess(parseOptionalPositiveInt, z.number().int().positive().optional()),
  AUTH_ADMIN_REFRESH_ABSOLUTE_DAYS: z.preprocess(parseOptionalPositiveInt, z.number().int().positive().optional()),
  ADMIN_REQUIRE_CF_ACCESS: z.preprocess(parseOptionalBoolean, z.boolean().optional()),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  FACEBOOK_CLIENT_ID: z.string().min(1).optional(),
  FACEBOOK_CLIENT_SECRET: z.string().min(1).optional(),
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
  return {
    accessTtlSeconds: env.AUTH_ACCESS_TTL_SECONDS ?? 60 * 15,
    refreshIdleDays: env.AUTH_REFRESH_IDLE_DAYS ?? 30,
    refreshAbsoluteDays: env.AUTH_REFRESH_ABSOLUTE_DAYS ?? 180,
    adminRefreshIdleHours: env.AUTH_ADMIN_REFRESH_IDLE_HOURS ?? 8,
    adminRefreshAbsoluteDays: env.AUTH_ADMIN_REFRESH_ABSOLUTE_DAYS ?? 7,
    refreshTokenSecret: env.AUTH_REFRESH_TOKEN_SECRET ?? env.AUTH_SECRET ?? "dev-refresh-secret-change-me",
  };
}

export function getHostRuntimeConfig() {
  const env = getRuntimeEnvironment();
  const appBaseUrl = env.APP_BASE_URL ?? "http://127.0.0.1:3000";
  const adminBaseUrl = env.ADMIN_BASE_URL ?? appBaseUrl;
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
  try {
    const context = getCloudflareContext();
    return context.env as MaybeCloudflareEnv;
  } catch {
    return process.env as MaybeCloudflareEnv;
  }
}
