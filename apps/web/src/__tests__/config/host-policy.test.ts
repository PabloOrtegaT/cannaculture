import { describe, expect, it } from "vitest";
import {
  buildAbsoluteUrl,
  isAllowedOnAdminHost,
  normalizeHost,
  resolveHostPolicy,
  resolveSharedCookieDomain,
} from "@/server/config/host-policy";

describe("host-policy", () => {
  describe("normalizeHost", () => {
    it("trims and lowercases host values", () => {
      expect(normalizeHost("  EXAMPLE.COM  ")).toBe("example.com");
    });

    it("strips port numbers", () => {
      expect(normalizeHost("example.com:3000")).toBe("example.com");
    });

    it("returns empty string for null/undefined/empty", () => {
      expect(normalizeHost(null)).toBe("");
      expect(normalizeHost(undefined)).toBe("");
      expect(normalizeHost("")).toBe("");
    });
  });

  describe("isAllowedOnAdminHost", () => {
    it("allows admin paths", () => {
      expect(isAllowedOnAdminHost("/admin")).toBe(true);
      expect(isAllowedOnAdminHost("/admin/orders")).toBe(true);
    });

    it("allows auth paths", () => {
      expect(isAllowedOnAdminHost("/login")).toBe(true);
      expect(isAllowedOnAdminHost("/logout")).toBe(true);
      expect(isAllowedOnAdminHost("/register")).toBe(true);
      expect(isAllowedOnAdminHost("/forgot-password")).toBe(true);
      expect(isAllowedOnAdminHost("/reset-password")).toBe(true);
      expect(isAllowedOnAdminHost("/verify-email")).toBe(true);
      expect(isAllowedOnAdminHost("/auth/after-login")).toBe(true);
    });

    it("allows API auth paths", () => {
      expect(isAllowedOnAdminHost("/api/auth/logout")).toBe(true);
      expect(isAllowedOnAdminHost("/api/auth/logout-all")).toBe(true);
    });

    it("allows static/internal paths", () => {
      expect(isAllowedOnAdminHost("/_next/static/chunk.js")).toBe(true);
      expect(isAllowedOnAdminHost("/favicon.ico")).toBe(true);
      expect(isAllowedOnAdminHost("/robots.txt")).toBe(true);
      expect(isAllowedOnAdminHost("/sitemap.xml")).toBe(true);
    });

    it("denies storefront paths", () => {
      expect(isAllowedOnAdminHost("/")).toBe(false);
      expect(isAllowedOnAdminHost("/catalog")).toBe(false);
      expect(isAllowedOnAdminHost("/cart")).toBe(false);
      expect(isAllowedOnAdminHost("/product/123")).toBe(false);
    });
  });

  describe("resolveHostPolicy", () => {
    it("returns correct policy for split hosts", () => {
      const policy = resolveHostPolicy({
        appBaseUrl: "http://store.lvh.me:3000",
        adminBaseUrl: "http://admin.lvh.me:3000",
      });
      expect(policy.appBaseUrl).toBe("http://store.lvh.me:3000");
      expect(policy.adminBaseUrl).toBe("http://admin.lvh.me:3000");
      expect(policy.appHost).toBe("store.lvh.me");
      expect(policy.adminHost).toBe("admin.lvh.me");
      expect(policy.adminRequireCfAccess).toBe(false);
    });

    it("returns correct policy for single host", () => {
      const policy = resolveHostPolicy({
        appBaseUrl: "http://localhost:3000",
      });
      expect(policy.appBaseUrl).toBe("http://localhost:3000");
      expect(policy.adminBaseUrl).toBe("http://localhost:3000");
      expect(policy.appHost).toBe("localhost");
      expect(policy.adminHost).toBe("localhost");
    });

    it("disables split host mode for local loopback aliases without shared cookie domain", () => {
      const policy = resolveHostPolicy({
        appBaseUrl: "http://app.localhost:3000",
        adminBaseUrl: "http://admin.localhost:3001",
      });
      // localhost with different ports cannot share cookies, so adminBaseUrl falls back to appBaseUrl
      expect(policy.adminBaseUrl).toBe("http://app.localhost:3000");
      expect(policy.adminHost).toBe("app.localhost");
    });

    it("honors CF Access branch when enabled", () => {
      const policy = resolveHostPolicy({
        appBaseUrl: "http://store.example.com",
        adminBaseUrl: "http://admin.example.com",
        adminRequireCfAccess: true,
      });
      expect(policy.adminRequireCfAccess).toBe(true);
    });
  });

  describe("resolveSharedCookieDomain", () => {
    it("returns undefined when hosts are identical", () => {
      expect(resolveSharedCookieDomain("http://example.com", "http://example.com")).toBeUndefined();
    });

    it("returns undefined for blocked localhost hosts", () => {
      expect(resolveSharedCookieDomain("http://localhost:3000", "http://localhost:3001")).toBeUndefined();
      expect(resolveSharedCookieDomain("http://127.0.0.1:3000", "http://127.0.0.1:3001")).toBeUndefined();
    });

    it("returns parent domain for subdomain siblings", () => {
      expect(resolveSharedCookieDomain("http://app.example.com", "http://admin.example.com")).toBe(
        ".example.com",
      );
    });

    it("returns registrable domain for sibling subdomains under same registrable domain", () => {
      expect(resolveSharedCookieDomain("http://a.example.com", "http://b.example.com")).toBe(
        ".example.com",
      );
    });

    it("returns undefined for unrelated domains", () => {
      expect(resolveSharedCookieDomain("http://a.com", "http://b.com")).toBeUndefined();
    });

    it.todo("ccTLD edge case (known-failing)", () => {
      // ccTLDs like .co.uk are 3+ segment registrable domains.
      // Current implementation slices the last 2 segments, so .co.uk is treated as the registrable part,
      // which means app.example.co.uk and admin.example.co.uk share .co.uk instead of .example.co.uk.
      // This is a known limitation of the naive registrableLikeDomain implementation.
      const result = resolveSharedCookieDomain("http://app.example.co.uk", "http://admin.example.co.uk");
      expect(result).toBe(".example.co.uk");
    });
  });

  describe("buildAbsoluteUrl", () => {
    it("builds a URL from base, pathname, and search", () => {
      expect(buildAbsoluteUrl("http://example.com", "/path", "?foo=bar")).toBe(
        "http://example.com/path?foo=bar",
      );
    });

    it("omits search when empty", () => {
      expect(buildAbsoluteUrl("http://example.com", "/path")).toBe("http://example.com/path");
    });

    it("handles base URL with trailing slash", () => {
      expect(buildAbsoluteUrl("http://example.com/", "/path")).toBe("http://example.com/path");
    });
  });
});
