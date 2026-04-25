import { beforeEach, describe, expect, it, vi } from "vitest";

const mockLimit = vi.fn();
const mockDeleteWhere = vi.fn(() => Promise.resolve());
const mockSetWhere = vi.fn(() => Promise.resolve());

vi.doMock("@/server/auth/password", () => ({
  hashPassword: vi.fn(() => Promise.resolve("hashed")),
  verifyPassword: vi.fn((password: string, hash: string) =>
    Promise.resolve(password === "NewPassword123!" && hash === "hashed"),
  ),
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
  getRuntimeEnvironment: vi.fn(() => ({
    APP_BASE_URL: "http://localhost:3000",
    AUTH_REFRESH_TOKEN_SECRET: "test-secret-that-is-long-enough",
  })),
  getAuthRuntimeConfig: vi.fn(() => ({
    accessTtlSeconds: 900,
    refreshIdleDays: 30,
    refreshAbsoluteDays: 180,
    adminRefreshIdleHours: 8,
    adminRefreshAbsoluteDays: 7,
    refreshTokenSecret: "test-secret-that-is-long-enough",
    adminRefreshTokenSecret: "test-secret-that-is-long-enough",
  })),
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
    const refreshSessions = await import("@/server/auth/refresh-sessions");
    const spy = vi.spyOn(refreshSessions, "revokeAllRefreshSessionsForUser");

    const result = await resetPasswordByToken("valid-token", "NewPassword123!");

    expect(result.ok).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("user-abc");
  });

  it("new password works for login after reset", async () => {
    mockLimit
      .mockResolvedValueOnce([
        { userId: "user-abc", expires: new Date("2099-01-01") },
      ])
      .mockResolvedValueOnce([
        {
          id: "user-abc",
          email: "user@example.com",
          passwordHash: "hashed",
          role: "owner",
          emailVerified: true,
          name: "Test User",
        },
      ]);

    const { resetPasswordByToken, validateCredentials } = await import(
      "@/server/auth/service"
    );

    await resetPasswordByToken("valid-token", "NewPassword123!");
    const user = await validateCredentials("user@example.com", "NewPassword123!");

    expect(user).not.toBeNull();
    expect(user?.id).toBe("user-abc");
    expect(user?.email).toBe("user@example.com");
  });

  it("old refresh tokens are rejected after reset", async () => {
    mockLimit
      .mockResolvedValueOnce([
        { userId: "user-abc", expires: new Date("2099-01-01") },
      ])
      .mockResolvedValueOnce([]);

    const { resetPasswordByToken } = await import("@/server/auth/service");
    const { getActiveRefreshSessionByToken } = await import(
      "@/server/auth/refresh-sessions"
    );

    await resetPasswordByToken("valid-token", "NewPassword123!");
    const session = await getActiveRefreshSessionByToken("old-refresh-token");

    expect(session).toBeNull();
  });
});
