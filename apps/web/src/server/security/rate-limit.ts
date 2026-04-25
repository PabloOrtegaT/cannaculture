import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { RateLimitResult } from "./rate-limit-durable-object";

export type { RateLimitResult };

export type RateLimitOptions = {
  key: string;
  maxRequests: number;
  windowMs: number;
};

function getRateLimiterBinding() {
  try {
    const context = getCloudflareContext();
    const env = context.env as unknown as Record<string, unknown>;
    const binding = env.RATE_LIMITER;
    if (!binding || typeof binding !== "object") {
      return null;
    }
    return binding as {
      getByName(name: string): {
        checkLimit(windowMs: number, maxRequests: number): Promise<RateLimitResult>;
      };
    };
  } catch {
    return null;
  }
}

export async function enforceRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const binding = getRateLimiterBinding();

  if (binding) {
    const stub = binding.getByName(options.key);
    return stub.checkLimit(options.windowMs, options.maxRequests);
  }

  // Fallback to in-memory Map when DO is not available (local dev without wrangler)
  return enforceRateLimitInMemory(options);
}

// In-memory fallback for local development without Durable Objects
const globalStore = new Map<string, number[]>();

function enforceRateLimitInMemory(options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const entries = globalStore.get(options.key) ?? [];
  const threshold = now - options.windowMs;
  const trimmedEntries = entries.filter((entry) => entry >= threshold);

  if (trimmedEntries.length >= options.maxRequests) {
    const oldestWithinWindow = trimmedEntries[0] ?? now;
    const retryAfterMs = Math.max(0, options.windowMs - (now - oldestWithinWindow));
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  globalStore.set(options.key, [...trimmedEntries, now]);

  return {
    allowed: true,
    retryAfterSeconds: 0,
  };
}

function firstForwardedIp(value: string | null) {
  if (!value) {
    return null;
  }
  const first = value.split(",")[0]?.trim();
  return first && first.length > 0 ? first : null;
}

export function getClientIpFromRequest(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ??
    firstForwardedIp(request.headers.get("x-forwarded-for")) ??
    "unknown"
  );
}

export function getClientIpFromHeaders(headersList: Headers) {
  return (
    headersList.get("cf-connecting-ip") ??
    firstForwardedIp(headersList.get("x-forwarded-for")) ??
    "unknown"
  );
}

export function hashEmailForRateLimit(email: string): string {
  // Simple hash to avoid storing raw emails in rate limit keys
  let hash = 0;
  const normalized = email.toLowerCase().trim();
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return `email_hash_${Math.abs(hash).toString(36)}`;
}
