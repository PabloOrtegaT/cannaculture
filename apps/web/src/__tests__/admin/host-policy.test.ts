import { describe, expect, it } from "vitest";
import {
  buildAbsoluteUrl,
  isAuthPath,
  isAdminPath,
  isAllowedOnAdminHost,
  isLocalDevelopmentHost,
  isStaticOrInternalPath,
  normalizeHost,
  resolveAdminEntryHref,
  resolveHostPolicy,
  resolveSharedCookieDomain,
  resolveSurfaceForHost,
} from "@/server/config/host-policy";

describe("host policy", () => {
  it("normalizes host values and strips ports", () => {
    expect(normalizeHost("ADMIN.LVH.ME:3000")).toBe("admin.lvh.me");
    expect(normalizeHost("")).toBe("");
  });

  it("resolves surface by configured hosts", () => {
    const policy = resolveHostPolicy({
      appBaseUrl: "http://storefront.lvh.me:3000",
      adminBaseUrl: "http://admin.lvh.me:3000",
    });

    expect(resolveSurfaceForHost(policy, "admin.lvh.me:3000")).toBe("admin");
    expect(resolveSurfaceForHost(policy, "storefront.lvh.me:3000")).toBe("storefront");
  });

  it("keeps admin host route boundaries", () => {
    expect(isAdminPath("/admin")).toBe(true);
    expect(isAdminPath("/admin/products")).toBe(true);
    expect(isAuthPath("/login")).toBe(true);
    expect(isAuthPath("/verify-email")).toBe(true);
    expect(isAuthPath("/catalog")).toBe(false);
    expect(isStaticOrInternalPath("/_next/static/chunk.js")).toBe(true);
    expect(isStaticOrInternalPath("/catalog")).toBe(false);
    expect(isAllowedOnAdminHost("/admin/import")).toBe(true);
    expect(isAllowedOnAdminHost("/login")).toBe(true);
    expect(isAllowedOnAdminHost("/api/auth/providers")).toBe(true);
    expect(isAllowedOnAdminHost("/catalog")).toBe(false);
  });

  it("resolves admin entry href for split and same-host setups", () => {
    const splitHref = resolveAdminEntryHref("https://spookynexus.com", "https://admin.spookynexus.com");
    expect(splitHref).toBe("https://admin.spookynexus.com/admin");

    const sameHostHref = resolveAdminEntryHref("https://spookynexus.com", "https://spookynexus.com");
    expect(sameHostHref).toBe("/admin");
  });

  it("builds absolute URLs and local host detection correctly", () => {
    expect(buildAbsoluteUrl("https://spookynexus.com", "/admin", "?q=1")).toBe("https://spookynexus.com/admin?q=1");
    expect(isLocalDevelopmentHost("localhost:3000")).toBe(true);
    expect(isLocalDevelopmentHost("storefront.lvh.me:3000")).toBe(true);
    expect(isLocalDevelopmentHost("spookynexus.com")).toBe(false);
  });

  it("resolves shared cookie domain only for compatible host pairs", () => {
    expect(resolveSharedCookieDomain("https://spookynexus.com", "https://admin.spookynexus.com")).toBe(".spookynexus.com");
    expect(resolveSharedCookieDomain("https://storefront.lvh.me:3000", "https://admin.lvh.me:3000")).toBe(".lvh.me");
    expect(resolveSharedCookieDomain("http://localhost:3000", "http://admin.localhost:3000")).toBeUndefined();
    expect(resolveSharedCookieDomain("https://spookynexus.com", "https://other-domain.com")).toBeUndefined();
    expect(resolveSharedCookieDomain("https://admin.shop.spookynexus.com", "https://shop.spookynexus.com")).toBe(
      ".shop.spookynexus.com",
    );
    expect(resolveSharedCookieDomain("https://intranet", "https://admin.intranet")).toBe(".intranet");
    expect(resolveSharedCookieDomain("not-a-url", "https://admin.spookynexus.com")).toBeUndefined();
  });
});
