import { describe, expect, it } from "vitest";
import {
  enforceRateLimit,
  getClientIpFromRequest,
  hashEmailForRateLimit,
} from "../../server/security/rate-limit";

describe("enforceRateLimit (in-memory fallback)", () => {
  it("allows requests within the limit", async () => {
    const result = await enforceRateLimit({
      key: "test:allow",
      maxRequests: 3,
      windowMs: 60_000,
    });
    expect(result.allowed).toBe(true);
    expect(result.retryAfterSeconds).toBe(0);
  });

  it("blocks requests over the limit", async () => {
    const key = "test:block";
    const windowMs = 60_000;

    // Exhaust the limit
    for (let i = 0; i < 3; i++) {
      await enforceRateLimit({ key, maxRequests: 3, windowMs });
    }

    const result = await enforceRateLimit({ key, maxRequests: 3, windowMs });
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets the window after expiry", async () => {
    const key = "test:reset";
    const windowMs = 100;

    // Exhaust the limit
    for (let i = 0; i < 2; i++) {
      await enforceRateLimit({ key, maxRequests: 2, windowMs });
    }

    const blocked = await enforceRateLimit({ key, maxRequests: 2, windowMs });
    expect(blocked.allowed).toBe(false);

    // Wait for window to pass
    await new Promise((resolve) => setTimeout(resolve, windowMs + 50));

    const allowed = await enforceRateLimit({ key, maxRequests: 2, windowMs });
    expect(allowed.allowed).toBe(true);
  });

  it("isolates different keys", async () => {
    const windowMs = 60_000;

    // Exhaust limit for key-a
    for (let i = 0; i < 2; i++) {
      await enforceRateLimit({ key: "key-a", maxRequests: 2, windowMs });
    }

    const blocked = await enforceRateLimit({ key: "key-a", maxRequests: 2, windowMs });
    expect(blocked.allowed).toBe(false);

    // key-b should still be allowed
    const allowed = await enforceRateLimit({ key: "key-b", maxRequests: 2, windowMs });
    expect(allowed.allowed).toBe(true);
  });
});

describe("getClientIpFromRequest", () => {
  it("prefers cf-connecting-ip", () => {
    const request = new Request("http://example.com", {
      headers: {
        "cf-connecting-ip": "1.2.3.4",
        "x-forwarded-for": "5.6.7.8, 9.10.11.12",
      },
    });
    expect(getClientIpFromRequest(request)).toBe("1.2.3.4");
  });

  it("falls back to x-forwarded-for first entry", () => {
    const request = new Request("http://example.com", {
      headers: {
        "x-forwarded-for": "5.6.7.8, 9.10.11.12",
      },
    });
    expect(getClientIpFromRequest(request)).toBe("5.6.7.8");
  });

  it("returns unknown when no headers present", () => {
    const request = new Request("http://example.com");
    expect(getClientIpFromRequest(request)).toBe("unknown");
  });
});

describe("hashEmailForRateLimit", () => {
  it("returns consistent hashes for the same email", () => {
    const hash1 = hashEmailForRateLimit("user@example.com");
    const hash2 = hashEmailForRateLimit("user@example.com");
    expect(hash1).toBe(hash2);
  });

  it("is case-insensitive", () => {
    const hash1 = hashEmailForRateLimit("User@Example.COM");
    const hash2 = hashEmailForRateLimit("user@example.com");
    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different emails", () => {
    const hash1 = hashEmailForRateLimit("a@example.com");
    const hash2 = hashEmailForRateLimit("b@example.com");
    expect(hash1).not.toBe(hash2);
  });
});
