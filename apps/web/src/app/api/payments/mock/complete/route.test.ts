import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/payments/mock/complete", () => {
  it("returns 404 when NEXTJS_ENV is production", async () => {
    const originalEnv = process.env.NEXTJS_ENV;
    process.env.NEXTJS_ENV = "production";

    const request = new Request("http://localhost:3000/api/payments/mock/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);

    process.env.NEXTJS_ENV = originalEnv;

    expect(response.status).toBe(404);
  });
});
