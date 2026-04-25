import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const mockReturning = vi.fn<() => Promise<{ id: string }[]>>(() => Promise.resolve([]));
const mockWhere = vi.fn<(...args: unknown[]) => { returning: typeof mockReturning }>(() => ({ returning: mockReturning }));
const mockDelete = vi.fn<() => { where: typeof mockWhere }>(() => ({ where: mockWhere }));
const mockDb = { delete: mockDelete };

vi.doMock("@/server/db/client", () => ({
  getDb: vi.fn(() => mockDb),
}));

vi.doMock("drizzle-orm", () => ({
  lt: (a: unknown, b: unknown) => ({ type: "lt", a, b }),
  or: (...args: unknown[]) => ({ type: "or", args }),
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    type: "sql",
    strings,
    values,
  }),
}));

const mockGetAuthSweepRuntimeConfig = vi.fn();
vi.doMock("@/server/config/runtime-env", () => ({
  getAuthSweepRuntimeConfig: mockGetAuthSweepRuntimeConfig,
  getRuntimeEnvironment: vi.fn(() => ({
    AUTH_REFRESH_SWEEP_TOKEN: "test-sweep-token",
  })),
}));

const { sweepExpiredRefreshSessions } = await import(
  "@/server/auth/refresh-sessions"
);
const { POST } = await import("@/app/api/auth/sweep/route");

describe("sweepExpiredRefreshSessions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-25T12:00:00.000Z"));
    vi.clearAllMocks();
    mockWhere.mockReset();
    mockReturning.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("deletes expired sessions older than 30 days", async () => {
    mockReturning.mockResolvedValueOnce([{ id: "s1" }, { id: "s2" }]);
    const result = await sweepExpiredRefreshSessions(mockDb as unknown as Parameters<
      typeof sweepExpiredRefreshSessions
    >[0]);
    expect(result).toBe(2);

    const whereCall = mockWhere.mock.calls[0];
    if (!whereCall) throw new Error("Expected where to be called");
    const condition = whereCall[0] as unknown as { type: string; args: unknown[] };
    expect(condition.type).toBe("or");
    expect(condition.args).toHaveLength(3);
    expect(condition.args[0]).toMatchObject({ type: "lt" });
    expect(condition.args[1]).toMatchObject({ type: "lt" });
    expect(condition.args[2]).toMatchObject({ type: "lt" });

    const threshold = condition.args[0] as unknown as { type: string; b: Date };
    const expectedThreshold = new Date("2026-03-26T12:00:00.000Z");
    expect(threshold.b.getTime()).toBe(expectedThreshold.getTime());
  });

  it("returns zero when no sessions match", async () => {
    mockReturning.mockResolvedValueOnce([]);
    const result = await sweepExpiredRefreshSessions(mockDb as unknown as Parameters<
      typeof sweepExpiredRefreshSessions
    >[0]);
    expect(result).toBe(0);
  });

  it("uses correct 30-day threshold", async () => {
    vi.setSystemTime(new Date("2026-06-15T00:00:00.000Z"));
    mockReturning.mockResolvedValueOnce([]);
    await sweepExpiredRefreshSessions(mockDb as unknown as Parameters<
      typeof sweepExpiredRefreshSessions
    >[0]);

    const whereCall = mockWhere.mock.calls[0];
    if (!whereCall) throw new Error("Expected where to be called");
    const condition = whereCall[0] as unknown as { type: string; args: Array<{ b: Date }> };
    const expectedThreshold = new Date("2026-05-16T00:00:00.000Z");
    expect(condition.args[0]?.b.getTime()).toBe(expectedThreshold.getTime());
  });
});

describe("POST /api/auth/sweep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWhere.mockReset();
    mockReturning.mockReset();
    mockGetAuthSweepRuntimeConfig.mockReset();
  });

  it("returns 503 when sweeper token is not configured", async () => {
    mockGetAuthSweepRuntimeConfig.mockReturnValueOnce({ sweeperToken: undefined });
    const req = new Request("http://localhost/api/auth/sweep", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(503);
  });

  it("returns 401 when authorization header is missing", async () => {
    mockGetAuthSweepRuntimeConfig.mockReturnValueOnce({ sweeperToken: "secret" });
    const req = new Request("http://localhost/api/auth/sweep", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 when authorization header is invalid", async () => {
    mockGetAuthSweepRuntimeConfig.mockReturnValueOnce({ sweeperToken: "secret" });
    const req = new Request("http://localhost/api/auth/sweep", {
      method: "POST",
      headers: { Authorization: "Bearer wrong" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns deleted count on success", async () => {
    mockGetAuthSweepRuntimeConfig.mockReturnValueOnce({ sweeperToken: "secret" });
    mockReturning.mockResolvedValueOnce([{ id: "s1" }, { id: "s2" }]);
    const req = new Request("http://localhost/api/auth/sweep", {
      method: "POST",
      headers: { Authorization: "Bearer secret" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { deleted: number };
    expect(json.deleted).toBe(2);
  });

  it("returns 500 when sweeper throws", async () => {
    mockGetAuthSweepRuntimeConfig.mockReturnValueOnce({ sweeperToken: "secret" });
    mockReturning.mockRejectedValueOnce(new Error("db error"));
    const req = new Request("http://localhost/api/auth/sweep", {
      method: "POST",
      headers: { Authorization: "Bearer secret" },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = (await res.json()) as { success: boolean; error: string };
    expect(json.success).toBe(false);
    expect(json.error).toContain("db error");
  });
});
