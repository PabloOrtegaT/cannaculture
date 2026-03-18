type RateLimitBucket = {
  entries: number[];
};

type RateLimitOptions = {
  key: string;
  maxRequests: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

type GlobalWithRateLimitStore = typeof globalThis & {
  __baseRateLimitStore?: Map<string, RateLimitBucket>;
};

function getStore() {
  const globalScope = globalThis as GlobalWithRateLimitStore;
  if (!globalScope.__baseRateLimitStore) {
    globalScope.__baseRateLimitStore = new Map();
  }
  return globalScope.__baseRateLimitStore;
}

function trimOldEntries(entries: number[], windowMs: number, now: number) {
  const threshold = now - windowMs;
  return entries.filter((entry) => entry >= threshold);
}

export function enforceRateLimit(options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const store = getStore();
  const current = store.get(options.key) ?? { entries: [] };
  const trimmedEntries = trimOldEntries(current.entries, options.windowMs, now);

  if (trimmedEntries.length >= options.maxRequests) {
    const oldestWithinWindow = trimmedEntries[0] ?? now;
    const retryAfterMs = Math.max(0, options.windowMs - (now - oldestWithinWindow));
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  const nextEntries = [...trimmedEntries, now];
  store.set(options.key, { entries: nextEntries });

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
    firstForwardedIp(request.headers.get("x-forwarded-for")) ??
    request.headers.get("cf-connecting-ip") ??
    "unknown"
  );
}

