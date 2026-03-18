import { beforeEach, describe, expect, it, vi } from "vitest";

const { requestPasswordResetMock } = vi.hoisted(() => ({
  requestPasswordResetMock: vi.fn(),
}));

vi.mock("@/server/auth/service", () => ({
  requestPasswordReset: requestPasswordResetMock,
}));

import { POST } from "@/app/api/auth/forgot-password/route";

describe("api/auth/forgot-password route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requestPasswordResetMock.mockResolvedValue({ ok: true });
  });

  it("redirects with invalid_input when payload is invalid", async () => {
    const formData = new FormData();
    const request = new Request("http://localhost:3000/api/auth/forgot-password", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/forgot-password?error=invalid_input");
    expect(requestPasswordResetMock).not.toHaveBeenCalled();
  });

  it("submits password reset and redirects to sent state", async () => {
    const formData = new FormData();
    formData.set("email", "user@example.com");
    const request = new Request("http://localhost:3000/api/auth/forgot-password", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);

    expect(requestPasswordResetMock).toHaveBeenCalledWith("user@example.com", "http://localhost:3000");
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/forgot-password?sent=1");
  });
});
