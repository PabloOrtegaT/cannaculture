import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifyEmailByTokenMock } = vi.hoisted(() => ({
  verifyEmailByTokenMock: vi.fn(),
}));

vi.mock("@/server/auth/service", () => ({
  verifyEmailByToken: verifyEmailByTokenMock,
}));

import { GET } from "@/app/api/auth/verify/route";

describe("api/auth/verify route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects with missing_token when token query parameter is absent", async () => {
    const request = new Request("http://localhost:3000/api/auth/verify");

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/verify-email?error=missing_token");
    expect(verifyEmailByTokenMock).not.toHaveBeenCalled();
  });

  it("delegates verification and redirects to service destination", async () => {
    verifyEmailByTokenMock.mockResolvedValue({ redirectTo: "/verify-email?verified=1" });
    const request = new Request("http://localhost:3000/api/auth/verify?token=abc");

    const response = await GET(request);

    expect(verifyEmailByTokenMock).toHaveBeenCalledWith("abc");
    expect(response.headers.get("location")).toBe("http://localhost:3000/verify-email?verified=1");
  });
});
