import { defineConfig, devices } from "@playwright/test";

const useCloudflarePreview = process.env.PLAYWRIGHT_USE_CF_PREVIEW === "1";
const localPort = process.env.PLAYWRIGHT_PORT ?? "3000";
const storefrontBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? (useCloudflarePreview ? "http://127.0.0.1:8787" : `http://storefront.lvh.me:${localPort}`);
const adminBaseUrl = process.env.PLAYWRIGHT_ADMIN_BASE_URL ?? (useCloudflarePreview ? storefrontBaseUrl : `http://admin.lvh.me:${localPort}`);
const nextAuthBaseUrl = process.env.NEXTAUTH_URL ?? (useCloudflarePreview ? storefrontBaseUrl : `http://lvh.me:${localPort}`);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: storefrontBaseUrl,
    trace: "on-first-retry",
  },
  webServer: {
    command: useCloudflarePreview
      ? "npm run db:migrate:local && npm run db:seed && npm run preview"
      : "npm run db:migrate:local && npm run db:seed && npm run dev",
    url: storefrontBaseUrl,
    env: {
      ...process.env,
      APP_BASE_URL: process.env.APP_BASE_URL ?? storefrontBaseUrl,
      ADMIN_BASE_URL: process.env.ADMIN_BASE_URL ?? adminBaseUrl,
      NEXTAUTH_URL: nextAuthBaseUrl,
      ADMIN_REQUIRE_CF_ACCESS: process.env.ADMIN_REQUIRE_CF_ACCESS ?? "false",
      PORT: process.env.PORT ?? localPort,
      STORE_PROFILE: process.env.STORE_PROFILE ?? "pc-components",
      AUTH_SECRET: process.env.AUTH_SECRET ?? "playwright-auth-secret-please-change",
      AUTH_REFRESH_TOKEN_SECRET: process.env.AUTH_REFRESH_TOKEN_SECRET ?? "playwright-refresh-secret-please-change",
    },
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === "1",
    timeout: useCloudflarePreview ? 300000 : 120000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
