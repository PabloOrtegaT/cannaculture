import { beforeEach, describe, expect, it, vi } from "vitest";

const mockEnforceRateLimit = vi.fn();
const mockGetClientIpFromRequest = vi.fn(() => "1.2.3.4");
const mockHashEmailForRateLimit = vi.fn((email: string) => `hash_${email.toLowerCase().trim()}`);
const mockRequestPasswordReset = vi.fn();
const mockTrackWarn = vi.fn();
const mockTrackError = vi.fn();

vi.doMock("@/server/security/rate-limit", () => ({
  enforceRateLimit: mockEnforceRateLimit,
  getClientIpFromRequest: mockGetClientIpFromRequest,
  hashEmailForRateLimit: mockHashEmailForRateLimit,
}));

vi.doMock("@/server/auth/service", () => ({
  requestPasswordReset: mockRequestPasswordReset,
}));

vi.doMock("@/server/observability/telemetry", () => ({
  trackWarn: mockTrackWarn,
  trackError: mockTrackError,
}));

const { POST } = await import("@/app/api/auth/forgot-password/route");

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceRateLimit.mockReset();
    mockRequestPasswordReset.mockReset();
  });

  function makeRequest(email: string): Request {
    const formData = new FormData();
    formData.append("email", email);
    return new Request("http://localhost/api/auth/forgot-password", {
      method: "POST",
      body: formData,
    });
  }

  it("blocks with rate_limited when IP rate limit is exceeded", async () => {
    mockEnforceRateLimit.mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 60 });

    const req = makeRequest("user@example.com");
    const res = await POST(req);

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("error=rate_limited");
    expect(mockEnforceRateLimit).toHaveBeenCalledWith({
      key: "auth:forgot-password:1.2.3.4",
      maxRequests: 12,
      windowMs: 60_000,
    });
    expect(mockRequestPasswordReset).not.toHaveBeenCalled();
    expect(mockTrackWarn).toHaveBeenCalledWith({
      scope: "api.auth.forgot-password",
      message: "rate_limited",
      metadata: { ip: "1.2.3.4", retryAfterSeconds: 60 },
    });
  });

  it("blocks with rate_limited when email rate limit is exceeded", async () => {
    mockEnforceRateLimit
      .mockResolvedValueOnce({ allowed: true, retryAfterSeconds: 0 }) // IP check passes
      .mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 3600 }); // email check fails

    const req = makeRequest("user@example.com");
    const res = await POST(req);

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("error=rate_limited");
    expect(mockEnforceRateLimit).toHaveBeenNthCalledWith(2, {
      key: "auth:forgot-password:email:hash_user@example.com",
      maxRequests: 3,
      windowMs: 3_600_000,
    });
    expect(mockRequestPasswordReset).not.toHaveBeenCalled();
    expect(mockTrackWarn).toHaveBeenCalledWith({
      scope: "api.auth.forgot-password",
      message: "rate_limited_email",
      metadata: { ip: "1.2.3.4", retryAfterSeconds: 3600 },
    });
  });

  it("sends reset email and redirects with sent=1 when both limits pass", async () => {
    mockEnforceRateLimit
      .mockResolvedValueOnce({ allowed: true, retryAfterSeconds: 0 })
      .mockResolvedValueOnce({ allowed: true, retryAfterSeconds: 0 });
    mockRequestPasswordReset.mockResolvedValueOnce(undefined);

    const req = makeRequest("user@example.com");
    const res = await POST(req);

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("sent=1");
    expect(mockRequestPasswordReset).toHaveBeenCalledWith("user@example.com", "http://localhost");
  });

  it("redirects with invalid_input for malformed email", async () => {
    mockEnforceRateLimit.mockResolvedValueOnce({ allowed: true, retryAfterSeconds: 0 });

    const formData = new FormData();
    formData.append("email", "not-an-email");
    const req = new Request("http://localhost/api/auth/forgot-password", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("error=invalid_input");
    expect(mockRequestPasswordReset).not.toHaveBeenCalled();
  });

  it("redirects with request_failed on service error", async () => {
    mockEnforceRateLimit
      .mockResolvedValueOnce({ allowed: true, retryAfterSeconds: 0 })
      .mockResolvedValueOnce({ allowed: true, retryAfterSeconds: 0 });
    mockRequestPasswordReset.mockRejectedValueOnce(new Error("SMTP error"));

    const req = makeRequest("user@example.com");
    const res = await POST(req);

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("error=request_failed");
    expect(mockTrackError).toHaveBeenCalledWith(
      "api.auth.forgot-password",
      expect.any(Error),
      { ip: "1.2.3.4" },
    );
  });
});
