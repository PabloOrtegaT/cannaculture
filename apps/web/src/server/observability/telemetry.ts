type TelemetryLevel = "info" | "warn" | "error";

type TelemetryPayload = {
  scope: string;
  message: string;
  metadata?: Record<string, unknown>;
};

function log(level: TelemetryLevel, payload: TelemetryPayload) {
  const entry = {
    level,
    scope: payload.scope,
    message: payload.message,
    ...(payload.metadata ? { metadata: payload.metadata } : {}),
    timestamp: new Date().toISOString(),
  };

  if (level === "error") {
    console.error("[telemetry]", JSON.stringify(entry));
    return;
  }

  if (level === "warn") {
    console.warn("[telemetry]", JSON.stringify(entry));
    return;
  }

  console.info("[telemetry]", JSON.stringify(entry));
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

