import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  adminMutationErrorCodes,
  createAdminMutationError,
  isAdminMutationError,
  mapAdminMutationError,
} from "@/server/admin/mutation-errors";

describe("admin mutation errors", () => {
  it("maps known admin mutation errors", () => {
    const result = mapAdminMutationError(createAdminMutationError("forbidden", "Forbidden."));
    expect(result.code).toBe("forbidden");
    expect(result.message).toBe("Forbidden.");
  });

  it("generates default safe messages for each known mutation error code", () => {
    for (const code of adminMutationErrorCodes) {
      const error = createAdminMutationError(code);
      expect(isAdminMutationError(error)).toBe(true);
      const mapped = mapAdminMutationError(error);
      expect(mapped.code).toBe(code);
      expect(mapped.message.length).toBeGreaterThan(0);
    }
  });

  it("maps zod validation errors into sanitized validation feedback", () => {
    const schema = z.object({
      slug: z.string().min(3),
    });

    const parsed = schema.safeParse({ slug: "x" });
    expect(parsed.success).toBe(false);
    if (parsed.success) {
      return;
    }

    const result = mapAdminMutationError(parsed.error);
    expect(result.code).toBe("validation");
    expect(result.message).toContain("slug");
  });

  it("maps unknown failures to a generic safe message", () => {
    const result = mapAdminMutationError(new Error("sensitive internals"));
    expect(result.code).toBe("unknown");
    expect(result.message).toBe("Could not complete this action. Please try again.");
  });

  it("maps non-error throwables to the same generic safe message", () => {
    const result = mapAdminMutationError("raw-string-error");
    expect(result.code).toBe("unknown");
    expect(result.message).toBe("Could not complete this action. Please try again.");
  });

  it("handles edge validation payloads and unknown error-code fallback branches", () => {
    const emptyZodError = new z.ZodError([]);
    const emptyMapped = mapAdminMutationError(emptyZodError);
    expect(emptyMapped.code).toBe("validation");
    expect(emptyMapped.message.length).toBeGreaterThan(0);

    const rootSchema = z.string().superRefine((_value, context) => {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Root failure",
      });
    });
    const parsed = rootSchema.safeParse("ok");
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const rootMapped = mapAdminMutationError(parsed.error);
      expect(rootMapped.code).toBe("validation");
      expect(rootMapped.message).toContain("Root failure");
    }

    const fallbackError = createAdminMutationError("unexpected-code" as never);
    const fallbackMapped = mapAdminMutationError(fallbackError);
    expect(fallbackMapped.code).toBe("unexpected-code");
    expect(fallbackMapped.message).toBe("Could not complete this action.");
  });
});
