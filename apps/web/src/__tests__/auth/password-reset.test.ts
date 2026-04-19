import { beforeEach, describe, expect, it, vi } from "vitest";

const revokeAllRefreshSessionsForUser = vi.fn();
const mockLimit = vi.fn();
const mockDeleteWhere = vi.fn(() => Promise.resolve());
const mockSetWhere = vi.fn(() => Promise.resolve());

vi.doMock("@/server/auth/refresh-sessions", () => ({
  revokeAllRefreshSessionsForUser,
}));

vi.doMock("@/server/auth/password", () => ({
  hashPassword: vi.fn(() => Promise.resolve("hashed")),
  verifyPassword: vi.fn(),
}));

vi.doMock("@/server/auth/tokens", () => ({
  createOpaqueToken: vi.fn(() => "token"),
  createTokenExpiry: vi.fn(() => new Date("2099-01-01")),
  isExpired: vi.fn(() => false),
}));

vi.doMock("@/server/auth/email", () => ({
  sendPasswordResetEmail: vi.fn(() => Promise.resolve()),
  sendVerificationEmail: vi.fn(() => Promise.resolve()),
}));

vi.doMock("@/server/config/runtime-env", () => ({
  getRuntimeEnvironment: vi.fn(() => ({ APP_BASE_URL: "http://localhost:3000" })),
}));

vi.doMock("@/server/db/client", () => ({
  getDb: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: mockLimit,
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: mockSetWhere,
      })),
    })),
    delete: vi.fn(() => ({
      where: mockDeleteWhere,
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: "u1" }])),
      })),
    })),
  })),
}));

vi.doMock("@/server/db/schema", () => ({
  usersTable: {},
  passwordResetTokensTable: {},
  verificationTokensTable: {},
  authRefreshSessionsTable: {},
}));

describe("resetPasswordByToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("revokes all refresh sessions after a successful reset (F3-1)", async () => {
    mockLimit.mockResolvedValueOnce([
      { userId: "user-abc", expires: new Date("2099-01-01") },
    ]);

    const { resetPasswordByToken } = await import("@/server/auth/service");

    const result = await resetPasswordByToken("valid-token", "NewPassword123!");

    expect(result.ok).toBe(true);
    expect(revokeAllRefreshSessionsForUser).toHaveBeenCalledTimes(1);
    expect(revokeAllRefreshSessionsForUser).toHaveBeenCalledWith("user-abc");
  });
});
