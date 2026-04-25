import { DurableObject } from "cloudflare:workers";

export interface Env {
  RATE_LIMITER: DurableObjectNamespace<RateLimiter>;
}

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export class RateLimiter extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS rate_limit_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp INTEGER NOT NULL
        )
      `);
    });
  }

  async checkLimit(windowMs: number, maxRequests: number): Promise<RateLimitResult> {
    const now = Date.now();
    const cutoff = now - windowMs;

    // Remove expired entries
    this.ctx.storage.sql.exec(
      `DELETE FROM rate_limit_entries WHERE timestamp < ?`,
      cutoff,
    );

    // Count remaining entries within window
    const countResult = this.ctx.storage.sql.exec<{ count: number }>(
      `SELECT COUNT(*) as count FROM rate_limit_entries`,
    );
    const count = countResult.one().count;

    if (count >= maxRequests) {
      // Get oldest entry to calculate retry-after
      const oldestResult = this.ctx.storage.sql.exec<{ timestamp: number }>(
        `SELECT timestamp FROM rate_limit_entries ORDER BY timestamp ASC LIMIT 1`,
      );
      const oldest = oldestResult.one().timestamp;
      const retryAfterMs = Math.max(0, windowMs - (now - oldest));

      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
      };
    }

    // Record this request
    this.ctx.storage.sql.exec(
      `INSERT INTO rate_limit_entries (timestamp) VALUES (?)`,
      now,
    );

    return {
      allowed: true,
      retryAfterSeconds: 0,
    };
  }
}
