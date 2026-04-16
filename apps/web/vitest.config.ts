import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "./coverage",
      include: [
        "src/app/api/**/route.ts",
        "src/app/(admin)/admin/actions.ts",
        "src/server/admin/mutation-errors.ts",
        "src/server/admin/role-guard.ts",
        "src/server/admin/stock-mode.ts",
        "src/server/admin/variant-attributes.ts",
        "src/server/config/host-policy.ts",
      ],
      thresholds: {
        lines: 90,
        branches: 90,
        functions: 90,
        statements: 90,
      },
    },
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
