import { beforeEach, describe, expect, it, vi } from "vitest";

const { registerEmailPasswordUserMock } = vi.hoisted(() => ({
  registerEmailPasswordUserMock: vi.fn(),
}));

vi.mock("@/server/auth/service", () => ({
  registerEmailPasswordUser: registerEmailPasswordUserMock,
}));

import { POST } from "@/app/api/auth/register/route";

describe("api/auth/register route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registerEmailPasswordUserMock.mockResolvedValue({
      redirectTo: "/login?registered=1",
    });
  });

  it("redirects with invalid_input when payload validation fails", async () => {
    const formData = new FormData();
    formData.set("name", "John");
    formData.set("email", "invalid-email");
    formData.set("password", "123");

    const request = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/register?error=invalid_input");
    expect(registerEmailPasswordUserMock).not.toHaveBeenCalled();
  });

  it("registers and redirects to service-provided destination", async () => {
    const formData = new FormData();
    formData.set("name", "John");
    formData.set("email", "john@example.com");
    formData.set("password", "StrongPass123!");

    const request = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);

    expect(registerEmailPasswordUserMock).toHaveBeenCalledWith({
      name: "John",
      email: "john@example.com",
      password: "StrongPass123!",
      origin: "http://localhost:3000",
    });
    expect(response.headers.get("location")).toBe("http://localhost:3000/login?registered=1");
  });

  it("maps service errors into encoded query parameters", async () => {
    registerEmailPasswordUserMock.mockRejectedValue(new Error("email_taken"));
    const formData = new FormData();
    formData.set("name", "John");
    formData.set("email", "john@example.com");
    formData.set("password", "StrongPass123!");

    const request = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);

    expect(response.headers.get("location")).toBe("http://localhost:3000/register?error=email_taken");
  });
});
