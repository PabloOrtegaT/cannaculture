import { describe, expect, it } from "vitest";
import { defaultStoreProfile, resolveStoreProfile } from "@base-ecommerce/domain";

describe("store profile contract", () => {
  it("falls back to the default profile when no value is provided", () => {
    expect(resolveStoreProfile(undefined)).toBe(defaultStoreProfile);
    expect(resolveStoreProfile(null)).toBe(defaultStoreProfile);
  });

  it("accepts known profile values", () => {
    expect(resolveStoreProfile("prints-3d")).toBe("prints-3d");
    expect(resolveStoreProfile("pc-components")).toBe("pc-components");
    expect(resolveStoreProfile("plant-seeds")).toBe("plant-seeds");
  });

  it("rejects unsupported profile values", () => {
    expect(() => resolveStoreProfile("mixed-store")).toThrow();
  });
});
