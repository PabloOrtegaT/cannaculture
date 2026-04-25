import { defineConfig, devices } from "@playwright/test";

const useCloudflarePreview = process.env.PLAYWRIGHT_USE_CF_PREVIEW === "1";
const localPort = process.env.PLAYWRIGHT_PORT ?? "3000";
const storefrontBaseUrl =
  process.env.PLAYWRIGHT_BASE_URL ??
  (useCloudflarePreview ? "http://127.0.0.1:8787" : `http://storefront.lvh.me:${localPort}`);
const adminBaseUrl =
  process.env.PLAYWRIGHT_ADMIN_BASE_URL ??
  (useCloudflarePreview ? storefrontBaseUrl : `http://admin.lvh.me:${localPort}`);
const nextAuthBaseUrl =
  process.env.NEXTAUTH_URL ??
  (useCloudflarePreview ? storefrontBaseUrl : `http://lvh.me:${localPort}`);
const webServerReadyUrl = process.env.PLAYWRIGHT_WEB_SERVER_READY_URL ?? storefrontBaseUrl;
const disableWebServer = process.env.PLAYWRIGHT_DISABLE_WEBSERVER === "1";
const runDbBootstrap = process.env.PLAYWRIGHT_RUN_DB_BOOTSTRAP === "1";
// Default to not reusing to avoid stale servers / mismatched env vars locally.
// Set PLAYWRIGHT_REUSE_EXISTING_SERVER=1 explicitly to opt in.
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === "1";
const globalTimeoutMs = Number(process.env.PLAYWRIGHT_GLOBAL_TIMEOUT_MS ?? "120000");
const webServerTimeoutMs = Number(process.env.PLAYWRIGHT_WEB_SERVER_TIMEOUT_MS ?? "90000");
const testTimeoutMs = Number(process.env.PLAYWRIGHT_TEST_TIMEOUT_MS ?? "45000");
const nextDistDir = process.env.PLAYWRIGHT_NEXT_DIST_DIR ?? ".next-playwright";
const dbBootstrapCommand = "node ./scripts/playwright-db-bootstrap.mjs";
const localStartCommand = runDbBootstrap
  ? `${dbBootstrapCommand} && node ./scripts/run-next.mjs dev`
  : "node ./scripts/run-next.mjs dev";
const previewStartCommand = runDbBootstrap
  ? `${dbBootstrapCommand} && npm run preview`
  : "npm run preview";
const webServer = {
  command: useCloudflarePreview ? previewStartCommand : localStartCommand,
  url: webServerReadyUrl,
  env: {
    ...process.env,
    APP_BASE_URL: process.env.APP_BASE_URL ?? storefrontBaseUrl,
    ADMIN_BASE_URL: process.env.ADMIN_BASE_URL ?? adminBaseUrl,
    NEXTAUTH_URL: nextAuthBaseUrl,
    ADMIN_REQUIRE_CF_ACCESS: process.env.ADMIN_REQUIRE_CF_ACCESS ?? "false",
    PORT: process.env.PORT ?? localPort,
    STORE_PROFILE: process.env.STORE_PROFILE ?? "plant-seeds",
    AUTH_SECRET: process.env.AUTH_SECRET ?? "playwright-auth-secret-please-change",
    AUTH_REFRESH_TOKEN_SECRET:
      process.env.AUTH_REFRESH_TOKEN_SECRET ?? "playwright-refresh-secret-please-change",
    AUTH_ADMIN_REFRESH_TOKEN_SECRET:
      process.env.AUTH_ADMIN_REFRESH_TOKEN_SECRET ?? process.env.AUTH_REFRESH_TOKEN_SECRET ?? "playwright-refresh-secret-please-change",
    NEXT_DIST_DIR: process.env.NEXT_DIST_DIR ?? nextDistDir,
  },
  reuseExistingServer,
  timeout: webServerTimeoutMs,
  stdout: "pipe" as const,
  stderr: "pipe" as const,
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  globalTimeout: globalTimeoutMs,
  timeout: testTimeoutMs,
  maxFailures: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  expect: {
    timeout: 7000,
  },
  use: {
    baseURL: storefrontBaseUrl,
    trace: "on-first-retry",
    actionTimeout: 15000,
    navigationTimeout: 20000,
  },
  ...(disableWebServer ? {} : { webServer }),
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
