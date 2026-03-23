import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  globalTimeout: 300000,
  timeout: 60000,
  maxFailures: 100,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    navigationTimeout: 30000,
  },
  webServer: {
    command: "node ./scripts/run-next.mjs dev",
    url: "http://localhost:3000",
    timeout: 180000,
    reuseExistingServer: false,
    stdout: "pipe",
    stderr: "pipe",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
