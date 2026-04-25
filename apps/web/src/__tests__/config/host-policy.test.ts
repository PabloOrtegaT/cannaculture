import { describe, expect, it } from "vitest";
import {
  buildAbsoluteUrl,
  isAllowedOnAdminHost,
  isLocalDevelopmentHost,
  normalizeHost,
  resolveAdminEntryHref,
  resolveHostPolicy,
  resolveSharedCookieDomain,
  resolveSurfaceForHost,
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

    it("handles invalid URLs gracefully", () => {
      const policy = resolveHostPolicy({
        appBaseUrl: "not-a-url",
        adminBaseUrl: "also-not-a-url",
      });
      expect(policy.appHost).toBe("");
      expect(policy.adminHost).toBe("");
    });
  });

  describe("resolveSharedCookieDomain", () => {
    it("returns undefined when hosts are identical", () => {
      expect(resolveSharedCookieDomain("http://example.com", "http://example.com")).toBeUndefined();
    });

    it("returns undefined for blocked localhost hosts", () => {
      expect(resolveSharedCookieDomain("http://localhost:3000", "http://localhost:3001")).toBeUndefined();
      expect(resolveSharedCookieDomain("http://127.0.0.1:3000", "http://127.0.0.1:3001")).toBeUndefined();
      // One blocked and one not — must hit the blockedHosts branch (not the identical-host early return)
      expect(resolveSharedCookieDomain("http://localhost:3000", "http://example.com")).toBeUndefined();
      expect(resolveSharedCookieDomain("http://example.com", "http://localhost:3000")).toBeUndefined();
    });

    it("returns undefined when a hostname cannot be parsed", () => {
      expect(resolveSharedCookieDomain("not-a-url", "http://example.com")).toBeUndefined();
      expect(resolveSharedCookieDomain("http://example.com", "not-a-url")).toBeUndefined();
    });

    it("returns parent domain when one hostname is a direct subdomain of the other", () => {
      expect(resolveSharedCookieDomain("http://sub.admin.example.com", "http://admin.example.com")).toBe(
        ".admin.example.com",
      );
      expect(resolveSharedCookieDomain("http://admin.example.com", "http://sub.admin.example.com")).toBe(
        ".admin.example.com",
      );
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

    it("returns correct registrable domain for ccTLD subdomains", () => {
      // ccTLDs like .co.uk have 3+ segment registrable domains.
      // PSL correctly identifies example.co.uk as the registrable domain.
      expect(resolveSharedCookieDomain("http://app.example.co.uk", "http://admin.example.co.uk")).toBe(
        ".example.co.uk",
      );
    });

    it("returns undefined for unrelated domains even with same suffix", () => {
      expect(
        resolveSharedCookieDomain("http://admin.example.com", "http://storefront.other.com"),
      ).toBeUndefined();
    });
  });

  describe("resolveAdminEntryHref", () => {
    it("returns pathname when admin and app share the same host", () => {
      expect(resolveAdminEntryHref("http://example.com", "http://example.com")).toBe("/admin");
    });

    it("returns absolute URL when hosts differ", () => {
      expect(resolveAdminEntryHref("http://example.com", "http://admin.example.com")).toBe(
        "http://admin.example.com/admin",
      );
    });

    it("returns pathname when admin host is empty", () => {
      expect(resolveAdminEntryHref("http://example.com", "not-a-url")).toBe("/admin");
    });
  });

  describe("isLocalDevelopmentHost", () => {
    it("returns true for localhost", () => {
      expect(isLocalDevelopmentHost("localhost")).toBe(true);
      expect(isLocalDevelopmentHost("localhost:3000")).toBe(true);
    });

    it("returns true for 127.0.0.1", () => {
      expect(isLocalDevelopmentHost("127.0.0.1")).toBe(true);
    });

    it("returns true for loopback aliases", () => {
      expect(isLocalDevelopmentHost("app.lvh.me")).toBe(true);
      expect(isLocalDevelopmentHost("app.localhost")).toBe(true);
    });

    it("returns false for production hosts", () => {
      expect(isLocalDevelopmentHost("example.com")).toBe(false);
    });
  });

  describe("resolveSurfaceForHost", () => {
    it("returns admin when host matches adminHost", () => {
      const policy = resolveHostPolicy({
        appBaseUrl: "http://store.example.com",
        adminBaseUrl: "http://admin.example.com",
      });
      expect(resolveSurfaceForHost(policy, "admin.example.com")).toBe("admin");
      expect(resolveSurfaceForHost(policy, "admin.example.com:3000")).toBe("admin");
    });

    it("returns storefront when host does not match adminHost", () => {
      const policy = resolveHostPolicy({
        appBaseUrl: "http://store.example.com",
        adminBaseUrl: "http://admin.example.com",
      });
      expect(resolveSurfaceForHost(policy, "store.example.com")).toBe("storefront");
      expect(resolveSurfaceForHost(policy, "other.com")).toBe("storefront");
    });

    it("returns storefront for empty host", () => {
      const policy = resolveHostPolicy({
        appBaseUrl: "http://store.example.com",
        adminBaseUrl: "http://admin.example.com",
      });
      expect(resolveSurfaceForHost(policy, "")).toBe("storefront");
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
