import { afterEach, describe, expect, it } from "vitest";
import { enforceRateLimit, getClientIpFromRequest } from "@/server/security/rate-limit";

afterEach(() => {
  const scoped = globalThis as typeof globalThis & { __baseRateLimitStore?: unknown };
  delete scoped.__baseRateLimitStore;
});

describe("rate limit utility", () => {
  it("blocks requests after max within the same window", () => {
    const first = enforceRateLimit({ key: "cart:user-1", maxRequests: 2, windowMs: 10_000 });
    const second = enforceRateLimit({ key: "cart:user-1", maxRequests: 2, windowMs: 10_000 });
    const third = enforceRateLimit({ key: "cart:user-1", maxRequests: 2, windowMs: 10_000 });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("extracts client IP from forwarded headers", () => {
    const request = new Request("https://example.com", {
      headers: {
        "x-forwarded-for": "10.0.0.1, 172.16.0.10",
      },
    });

    expect(getClientIpFromRequest(request)).toBe("10.0.0.1");
  });
});
