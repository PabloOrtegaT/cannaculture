import { beforeEach, describe, expect, it, vi } from "vitest";

const { nextAuthHandlerMock, nextAuthFactoryMock, getAuthOptionsMock } = vi.hoisted(() => {
  const nextAuthHandler = vi.fn();
  return {
    nextAuthHandlerMock: nextAuthHandler,
    nextAuthFactoryMock: vi.fn(() => nextAuthHandler),
    getAuthOptionsMock: vi.fn(() => ({ secret: "test-secret" })),
  };
});

vi.mock("next-auth", () => ({
  default: nextAuthFactoryMock,
}));

vi.mock("@/server/auth/options", () => ({
  getAuthOptions: getAuthOptionsMock,
}));

import { GET, POST } from "@/app/api/auth/[...nextauth]/route";

describe("api/auth/[...nextauth] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nextAuthHandlerMock.mockResolvedValue(new Response("ok", { status: 200 }));
  });

  it("delegates GET requests to NextAuth handler with resolved options", async () => {
    const request = new Request("http://localhost:3000/api/auth/providers", { method: "GET" });
    const context = { params: {} };

    const response = await GET(request, context);

    expect(getAuthOptionsMock).toHaveBeenCalledTimes(1);
    expect(nextAuthFactoryMock).toHaveBeenCalledWith({ secret: "test-secret" });
    expect(nextAuthHandlerMock).toHaveBeenCalledWith(request, context);
    expect(response.status).toBe(200);
  });

  it("delegates POST requests to the same NextAuth handler", async () => {
    const request = new Request("http://localhost:3000/api/auth/callback/credentials", { method: "POST" });
    const context = { params: {} };

    const response = await POST(request, context);

    expect(getAuthOptionsMock).toHaveBeenCalledTimes(1);
    expect(nextAuthFactoryMock).toHaveBeenCalledTimes(1);
    expect(nextAuthHandlerMock).toHaveBeenCalledWith(request, context);
    expect(response.status).toBe(200);
  });
});
