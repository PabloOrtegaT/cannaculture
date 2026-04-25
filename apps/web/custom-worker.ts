// Custom Cloudflare Worker entry point for OpenNext
// Re-exports the fetch handler from OpenNext and adds scheduled (cron) handler

// @ts-expect-error `.open-next/worker.js` is generated at build time by opennextjs-cloudflare
import { default as handler } from "./.open-next/worker.js";
import { RateLimiter } from "./src/server/security/rate-limit-durable-object";

const worker = {
  fetch: handler.fetch,

  async scheduled(_controller: unknown, env: Record<string, unknown>) {
    const sweeperToken = env.INVENTORY_SWEEPER_TOKEN;
    const baseUrl = env.APP_BASE_URL;

    if (!sweeperToken || !baseUrl) {
      console.warn(
        "[scheduled] Sweeper not configured: missing INVENTORY_SWEEPER_TOKEN or APP_BASE_URL",
      );
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/api/inventory/sweep`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sweeperToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[scheduled] Sweeper failed: ${response.status} ${errorText}`);
      } else {
        const result = await response.json();
        console.log("[scheduled] Sweeper result:", result);
      }
    } catch (error) {
      console.error("[scheduled] Sweeper error:", error);
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
