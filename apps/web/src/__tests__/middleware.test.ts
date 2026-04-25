import { describe, expect, it } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { middleware } from "@/middleware";

function makeRequest(url: string, headers?: Record<string, string>) {
  return new NextRequest(new URL(url), headers ? { headers } : undefined);
}

describe("middleware", () => {
  it("allows requests with CF-Connecting-IP in production", () => {
    const originalEnv = process.env.NEXTJS_ENV;
    process.env.NEXTJS_ENV = "production";
    process.env.APP_BASE_URL = "https://storefront.example.com";
    process.env.ADMIN_BASE_URL = "https://admin.example.com";

    const req = makeRequest("https://storefront.example.com/catalog", {
      "cf-connecting-ip": "192.0.2.1",
    });

    const res = middleware(req);

    process.env.NEXTJS_ENV = originalEnv;

    expect(res).toBeInstanceOf(NextResponse);
    expect(res.status).toBe(200);
  });

  it("rejects requests without CF-Connecting-IP in production", () => {
    const originalEnv = process.env.NEXTJS_ENV;
    process.env.NEXTJS_ENV = "production";
    process.env.APP_BASE_URL = "https://storefront.example.com";
    process.env.ADMIN_BASE_URL = "https://admin.example.com";

    const req = makeRequest("https://storefront.example.com/catalog");

    const res = middleware(req);

    process.env.NEXTJS_ENV = originalEnv;

    expect(res.status).toBe(403);
    expect(res).toBeInstanceOf(NextResponse);
  });

  it("allows requests without CF-Connecting-IP in development", () => {
    const originalEnv = process.env.NEXTJS_ENV;
    process.env.NEXTJS_ENV = "development";
    process.env.APP_BASE_URL = "https://storefront.example.com";
    process.env.ADMIN_BASE_URL = "https://admin.example.com";

    const req = makeRequest("https://storefront.example.com/catalog");

    const res = middleware(req);

    process.env.NEXTJS_ENV = originalEnv;

    expect(res).toBeInstanceOf(NextResponse);
    expect(res.status).toBe(200);
  });

  it("rejects requests without CF-Connecting-IP even when hosts match", () => {
    const originalEnv = process.env.NEXTJS_ENV;
    process.env.NEXTJS_ENV = "production";
    process.env.APP_BASE_URL = "https://example.com";
    process.env.ADMIN_BASE_URL = "https://example.com";

    const req = makeRequest("https://example.com/catalog");

    const res = middleware(req);

    process.env.NEXTJS_ENV = originalEnv;

    expect(res.status).toBe(403);
    expect(res).toBeInstanceOf(NextResponse);
  });
});
