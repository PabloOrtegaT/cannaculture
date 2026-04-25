// Custom Cloudflare Worker entry point for OpenNext
// Re-exports the fetch handler from OpenNext and adds scheduled (cron) handler

// @ts-expect-error `.open-next/worker.js` is generated at build time by opennextjs-cloudflare
import { default as handler } from "./.open-next/worker.js";
import { RateLimiter } from "./src/server/security/rate-limit-durable-object";

const worker = {
  fetch: handler.fetch,

  async scheduled(_controller: unknown, env: Record<string, unknown>) {
    const sweeperToken = env.INVENTORY_SWEEPER_TOKEN;
    const authSweepToken = env.AUTH_REFRESH_SWEEP_TOKEN;
    const baseUrl = env.APP_BASE_URL;

    if (!baseUrl) {
      console.warn(
        "[scheduled] Sweeper not configured: missing APP_BASE_URL",
      );
      return;
    }

    if (sweeperToken) {
      try {
        const response = await fetch(`${baseUrl}/api/inventory/sweep`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sweeperToken}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[scheduled] Inventory sweeper failed: ${response.status} ${errorText}`);
        } else {
          const result = await response.json();
          console.log("[scheduled] Inventory sweeper result:", result);
        }
      } catch (error) {
        console.error("[scheduled] Inventory sweeper error:", error);
      }
    } else {
      console.warn("[scheduled] Inventory sweeper skipped: missing INVENTORY_SWEEPER_TOKEN");
    }

    if (authSweepToken) {
      try {
        const response = await fetch(`${baseUrl}/api/auth/sweep`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authSweepToken}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[scheduled] Auth sweeper failed: ${response.status} ${errorText}`);
        } else {
          const result = await response.json();
          console.log("[scheduled] Auth sweeper result:", result);
        }
      } catch (error) {
        console.error("[scheduled] Auth sweeper error:", error);
      }
    } else {
      console.warn("[scheduled] Auth sweeper skipped: missing AUTH_REFRESH_SWEEP_TOKEN");
    }
  },
};

export default worker;

// Export RateLimiter Durable Object for rate-limiting across Worker isolates
export { RateLimiter };

// Re-export Durable Object bindings if they exist in the generated worker
// These are required for certain caching features, but we don't use them
export const DOQueueHandler = handler.DOQueueHandler;
export const DOShardedTagCache = handler.DOShardedTagCache;
