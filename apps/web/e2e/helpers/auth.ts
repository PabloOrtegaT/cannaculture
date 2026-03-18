import { expect, type Page } from "@playwright/test";

type LoginOptions = {
  nextPath?: string;
};

function tryReadHost(value: string | undefined) {
  if (!value) {
    return null;
  }
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function getAllowedLocalHosts() {
  const hosts = new Set<string>(["localhost", "127.0.0.1", "storefront.lvh.me", "admin.lvh.me"]);
  const envHosts = [
    process.env.PLAYWRIGHT_BASE_URL,
    process.env.PLAYWRIGHT_ADMIN_BASE_URL,
    process.env.APP_BASE_URL,
    process.env.ADMIN_BASE_URL,
    process.env.NEXTAUTH_URL,
  ]
    .map(tryReadHost)
    .filter((value): value is string => Boolean(value));

  for (const host of envHosts) {
    hosts.add(host);
  }

  return hosts;
}

function assertStaysOnAllowedHost(page: Page) {
  const current = new URL(page.url()).hostname.toLowerCase();
  expect(getAllowedLocalHosts().has(current)).toBe(true);
}

function buildLoginUrl(nextPath: string) {
  if (!nextPath.startsWith("/admin")) {
    return `/login?next=${encodeURIComponent(nextPath)}`;
  }

  const adminBaseUrl = process.env.PLAYWRIGHT_ADMIN_BASE_URL ?? process.env.ADMIN_BASE_URL;
  if (!adminBaseUrl) {
    return `/login?next=${encodeURIComponent(nextPath)}`;
  }

  const url = new URL("/login", adminBaseUrl);
  url.searchParams.set("next", nextPath);
  return url.toString();
}

export async function loginAsSeedOwner(page: Page, options: LoginOptions = {}) {
  const nextPath = options.nextPath ?? "/auth/sync-cart?next=%2Fcart";
  await page.goto(buildLoginUrl(nextPath));
  await page.getByLabel("Email").fill("owner@base-ecommerce.local");
  await page.getByLabel("Password").fill("ChangeMe123!");
  await page.getByRole("button", { name: "Sign in" }).click();

  if (nextPath.startsWith("/admin")) {
    await page.waitForURL((url) => url.pathname.startsWith("/auth/after-login") || url.pathname === "/admin" || url.pathname.startsWith("/admin/"), {
      timeout: 30000,
    });
    await page.waitForURL((url) => url.pathname === "/admin" || url.pathname.startsWith("/admin/"), { timeout: 30000 });
    assertStaysOnAllowedHost(page);
    return;
  }

  await page.waitForURL(
    (url) => url.pathname.startsWith("/auth/after-login") || url.pathname.startsWith("/auth/sync-cart") || url.pathname === "/cart" || url.pathname.startsWith("/cart/"),
    {
      timeout: 30000,
    },
  );
  await page.waitForURL((url) => url.pathname === "/cart" || url.pathname.startsWith("/cart/"), { timeout: 30000 });
  assertStaysOnAllowedHost(page);
}
