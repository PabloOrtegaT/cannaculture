import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  trackInfo,
  trackWarn,
  trackError,
  resetTelemetryConfig,
  type StructuredLogEntry,
} from "@/server/observability/telemetry";

describe("telemetry", () => {
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    resetTelemetryConfig();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits info log with JSON payload", () => {
    trackInfo({ scope: "test", message: "hello" });
    expect(infoSpy).toHaveBeenCalledTimes(1);
    const raw = infoSpy.mock.calls[0]![1] as string;
    const parsed = JSON.parse(raw) as StructuredLogEntry;
    expect(parsed.level).toBe("info");
    expect(parsed.scope).toBe("test");
    expect(parsed.message).toBe("hello");
    expect(parsed.timestamp).toBeDefined();
    expect(parsed.service).toBe("cannaculture-web");
  });

  it("emits warn log with metadata", () => {
    trackWarn({ scope: "test", message: "careful", metadata: { count: 1 } });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const raw = warnSpy.mock.calls[0]![1] as string;
    const parsed = JSON.parse(raw) as StructuredLogEntry;
    expect(parsed.level).toBe("warn");
    expect(parsed.metadata).toEqual({ count: 1 });
  });

  it("emits error log from Error instance", () => {
    trackError("test", new Error("boom"));
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const raw = errorSpy.mock.calls[0]![1] as string;
    const parsed = JSON.parse(raw) as StructuredLogEntry;
    expect(parsed.level).toBe("error");
    expect(parsed.scope).toBe("test");
    expect(parsed.message).toBe("boom");
  });

  it("emits error log from non-Error value", () => {
    trackError("test", null);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const raw = errorSpy.mock.calls[0]![1] as string;
    const parsed = JSON.parse(raw) as StructuredLogEntry;
    expect(parsed.message).toBe("unknown_error");
  });
});
