import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackError, trackInfo, trackWarn } from "@/server/observability/telemetry";

describe("telemetry helpers", () => {
  const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

  beforeEach(() => {
    infoSpy.mockClear();
    warnSpy.mockClear();
    errorSpy.mockClear();
  });

  afterEach(() => {
    infoSpy.mockClear();
    warnSpy.mockClear();
    errorSpy.mockClear();
  });

  it("logs info and warn payloads", () => {
    trackInfo({ scope: "api.cart", message: "sync_ok" });
    trackWarn({ scope: "api.cart", message: "sync_retry" });

    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("logs errors with scope and message", () => {
    trackError("api.auth", new Error("boom"), { userId: "u1" });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const loggedPayload = String(errorSpy.mock.calls[0]?.[1] ?? "");
    expect(loggedPayload).toContain("api.auth");
    expect(loggedPayload).toContain("boom");
  });
});
