import { beforeEach, describe, expect, it, vi } from "vitest";

const { resetPasswordByTokenMock } = vi.hoisted(() => ({
  resetPasswordByTokenMock: vi.fn(),
}));

vi.mock("@/server/auth/service", () => ({
  resetPasswordByToken: resetPasswordByTokenMock,
}));

import { POST } from "@/app/api/auth/reset-password/route";

describe("api/auth/reset-password route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects with invalid_input when payload validation fails", async () => {
    const formData = new FormData();
    formData.set("token", "");
    formData.set("password", "short");
    const request = new Request("http://localhost:3000/api/auth/reset-password", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);

    expect(response.headers.get("location")).toBe("http://localhost:3000/reset-password?error=invalid_input");
    expect(resetPasswordByTokenMock).not.toHaveBeenCalled();
  });

  it("redirects with invalid_token when service cannot reset password", async () => {
    resetPasswordByTokenMock.mockResolvedValue({ ok: false });
    const formData = new FormData();
    formData.set("token", "token-12345678901234567890");
    formData.set("password", "NewPass123!");
    const request = new Request("http://localhost:3000/api/auth/reset-password", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);

    expect(resetPasswordByTokenMock).toHaveBeenCalledWith("token-12345678901234567890", "NewPass123!");
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/reset-password?token=token-12345678901234567890&error=invalid_token",
    );
  });

  it("redirects to success destination when reset succeeds", async () => {
    resetPasswordByTokenMock.mockResolvedValue({ ok: true, redirectTo: "/login?reset=1" });
    const formData = new FormData();
    formData.set("token", "token-abcdefghijklmnopqrstuvwxyz");
    formData.set("password", "NewPass123!");
    const request = new Request("http://localhost:3000/api/auth/reset-password", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);

    expect(response.headers.get("location")).toBe("http://localhost:3000/login?reset=1");
  });
});
