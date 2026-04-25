import { getTelemetryRuntimeConfig } from "@/server/config/runtime-env";

type TelemetryLevel = "info" | "warn" | "error";

type TelemetryDestination = "r2-logpush" | "axiom" | "baselime" | undefined;

interface TelemetryConfig {
  destination: TelemetryDestination;
  ingestUrl: string | undefined;
  ingestToken: string | undefined;
}

export type TelemetryPayload = {
  scope: string;
  message: string;
  metadata?: Record<string, unknown>;
};

export interface StructuredLogEntry {
  level: TelemetryLevel;
  scope: string;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
  service: string;
  environment: string;
  // Cloudflare-specific fields for Logpush compatibility
  event?: {
    requestId?: string;
    rayId?: string;
    scriptName?: string;
  };
}

let cachedConfig: TelemetryConfig | undefined;

function getConfig(): TelemetryConfig {
  if (cachedConfig) {
    return cachedConfig;
  }
  try {
    cachedConfig = getTelemetryRuntimeConfig();
  } catch {
    cachedConfig = { destination: undefined, ingestUrl: undefined, ingestToken: undefined };
  }
  return cachedConfig;
}

function buildStructuredEntry(level: TelemetryLevel, payload: TelemetryPayload): StructuredLogEntry {
  const isDev = process.env.NODE_ENV === "development" || process.env.NEXTJS_ENV === "development";
  return {
    level,
    scope: payload.scope,
    message: payload.message,
    ...(payload.metadata ? { metadata: payload.metadata } : {}),
    timestamp: new Date().toISOString(),
    service: "cannaculture-web",
    environment: isDev ? "development" : "production",
  };
}

function formatForDestination(entry: StructuredLogEntry, destination: TelemetryDestination): unknown {
  if (destination === "axiom") {
    // Axiom expects _time as the timestamp field
    return {
      _time: entry.timestamp,
      level: entry.level,
      scope: entry.scope,
      message: entry.message,
      service: entry.service,
      environment: entry.environment,
      ...(entry.metadata ? { metadata: entry.metadata } : {}),
    };
  }

  if (destination === "baselime") {
    // Baselime uses @timestamp and nested data
    return {
      "@timestamp": entry.timestamp,
      level: entry.level,
      scope: entry.scope,
      message: entry.message,
      service: entry.service,
      environment: entry.environment,
      data: entry.metadata,
    };
  }

  // R2 Logpush and dashboard-only: native Cloudflare Workers structured log format
  // Cloudflare Logpush captures console.* JSON automatically when valid JSON is emitted
  return entry;
}

async function forwardToHttp(entry: unknown, url: string, token: string): Promise<void> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(entry),
    });
    if (!response.ok) {
      console.error(
        `[telemetry] HTTP forward failed: ${response.status} ${response.statusText}`,
      );
    }
  } catch (err) {
    console.error("[telemetry] HTTP forward error:", err instanceof Error ? err.message : err);
  }
}

function log(level: TelemetryLevel, payload: TelemetryPayload) {
  const config = getConfig();
  const entry = buildStructuredEntry(level, payload);
  const formatted = formatForDestination(entry, config.destination);
  const serialized = JSON.stringify(formatted);

  // Always emit to console so Cloudflare dashboard / Logpush can capture it
  if (level === "error") {
    console.error("[telemetry]", serialized);
  } else if (level === "warn") {
    console.warn("[telemetry]", serialized);
  } else {
    console.info("[telemetry]", serialized);
  }

  // If a third-party destination is configured and has HTTP credentials, forward there too
  if (
    config.destination &&
    config.destination !== "r2-logpush" &&
    config.ingestUrl &&
    config.ingestToken
  ) {
    // Fire-and-forget; do not block the caller on telemetry
    void forwardToHttp(formatted, config.ingestUrl, config.ingestToken);
  }
}

export function trackInfo(payload: TelemetryPayload) {
  log("info", payload);
}

export function trackWarn(payload: TelemetryPayload) {
  log("warn", payload);
}

export function trackError(scope: string, error: unknown, metadata?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : "unknown_error";
  log("error", {
    scope,
    message,
    ...(metadata ? { metadata } : {}),
  });
}

/**
 * Reset the cached telemetry configuration. Used primarily in tests.
 */
export function resetTelemetryConfig() {
  cachedConfig = undefined;
}
