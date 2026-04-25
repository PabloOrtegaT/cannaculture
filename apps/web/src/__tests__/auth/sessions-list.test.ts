import {
  type Mock,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

interface MockDb {
  select: Mock<() => MockDb>;
  from: Mock<() => MockDb>;
  where: Mock<(...args: unknown[]) => MockDb>;
  orderBy: Mock<(...args: unknown[]) => MockDb>;
  limit: Mock<() => Promise<unknown[]>>;
}

const mockLimit = vi.fn<() => Promise<unknown[]>>(() => Promise.resolve([]));
const mockDb: MockDb = {
  select: vi.fn<() => MockDb>(() => mockDb),
  from: vi.fn<() => MockDb>(() => mockDb),
  where: vi.fn<(...args: unknown[]) => MockDb>(() => mockDb),
  orderBy: vi.fn<(...args: unknown[]) => MockDb>(() => mockDb),
  limit: mockLimit,
};

vi.doMock("@/server/db/client", () => ({
  getDb: vi.fn(() => mockDb),
}));

vi.doMock("drizzle-orm", () => ({
  and: (...args: unknown[]) => ({ type: "and", args }),
  eq: (a: unknown, b: unknown) => ({ type: "eq", a, b }),
  gt: (a: unknown, b: unknown) => ({ type: "gt", a, b }),
  lt: (a: unknown, b: unknown) => ({ type: "lt", a, b }),
  or: (...args: unknown[]) => ({ type: "or", args }),
  isNull: (a: unknown) => ({ type: "isNull", a }),
  desc: (a: unknown) => ({ type: "desc", a }),
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    type: "sql",
    strings,
    values,
  }),
}));

const mockGetSessionUser = vi.fn();
vi.doMock("@/server/auth/session", () => ({
  getSessionUser: mockGetSessionUser,
}));

vi.doMock("@/server/auth/tokens", () => ({
  createOpaqueToken: vi.fn(() => "token"),
}));

const { GET } = await import("@/app/api/auth/sessions/route");
const { listActiveRefreshSessionsForUser } = await import(
  "@/server/auth/refresh-sessions"
);

interface SessionListResponse {
  sessions: Array<Record<string, unknown>>;
  nextCursor: string | null;
}

describe("GET /api/auth/sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSessionUser.mockReset();
    mockLimit.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSessionUser.mockResolvedValueOnce(null);
    const req = new Request("http://localhost/api/auth/sessions");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("Unauthorized");
  });

  it("uses default limit of 50", async () => {
    mockGetSessionUser.mockResolvedValueOnce({ id: "u1" });
    mockLimit.mockResolvedValueOnce([]);
    const req = new Request("http://localhost/api/auth/sessions");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as SessionListResponse;
    expect(json.sessions).toEqual([]);
    expect(json.nextCursor).toBeNull();
    expect(mockLimit).toHaveBeenCalledWith(51);
  });

  it("accepts custom limit", async () => {
    mockGetSessionUser.mockResolvedValueOnce({ id: "u1" });
    mockLimit.mockResolvedValueOnce([]);
    const req = new Request("http://localhost/api/auth/sessions?limit=10");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mockLimit).toHaveBeenCalledWith(11);
  });

  it("returns paginated sessions with nextCursor", async () => {
    mockGetSessionUser.mockResolvedValueOnce({ id: "u1" });
    const rows = Array.from({ length: 3 }, (_, i) => ({
      id: `s${i}`,
      surface: "storefront",
      deviceId: `d${i}`,
      userAgent: "ua",
      createdAt: new Date(2026, 0, 1, 0, 0, i),
      lastSeenAt: new Date(2026, 0, 1, 0, 0, i),
      idleExpiresAt: new Date("2099-01-01"),
      absoluteExpiresAt: new Date("2099-01-01"),
      revokedAt: null,
    }));
    mockLimit.mockResolvedValueOnce(rows);
    const req = new Request("http://localhost/api/auth/sessions?limit=2");
    const res = await GET(req);
    const json = (await res.json()) as SessionListResponse;
    expect(json.sessions).toHaveLength(2);
    expect(json.nextCursor).not.toBeNull();
    expect(typeof json.nextCursor).toBe("string");

    mockLimit.mockResolvedValueOnce([rows[2]]);
    mockGetSessionUser.mockResolvedValueOnce({ id: "u1" });
    const req2 = new Request(
      `http://localhost/api/auth/sessions?limit=2&cursor=${json.nextCursor}`,
    );
    const res2 = await GET(req2);
    const json2 = (await res2.json()) as SessionListResponse;
    expect(json2.sessions).toHaveLength(1);
    expect(json2.nextCursor).toBeNull();
  });

  it("rejects invalid limit", async () => {
    mockGetSessionUser.mockResolvedValueOnce({ id: "u1" });
    const req = new Request("http://localhost/api/auth/sessions?limit=0");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("rejects limit above 100", async () => {
    mockGetSessionUser.mockResolvedValueOnce({ id: "u1" });
    const req = new Request("http://localhost/api/auth/sessions?limit=101");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});

describe("listActiveRefreshSessionsForUser", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
    vi.clearAllMocks();
    mockLimit.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("filters expired and revoked sessions in query conditions", async () => {
    mockLimit.mockResolvedValueOnce([]);
    await listActiveRefreshSessionsForUser("u1");
    const call = mockDb.where.mock.calls[0];
    if (!call) throw new Error("Expected where to be called");
    const whereCall = call[0] as { type: string; args: unknown[] };
    expect(whereCall.type).toBe("and");
    expect(whereCall.args).toHaveLength(4);
    expect(whereCall.args[0]).toMatchObject({ type: "eq" });
    expect(whereCall.args[1]).toMatchObject({ type: "isNull" });
    expect(whereCall.args[2]).toMatchObject({ type: "gt" });
    expect(whereCall.args[3]).toMatchObject({ type: "gt" });
  });

  it("orders by createdAt desc then id desc", async () => {
    mockLimit.mockResolvedValueOnce([]);
    await listActiveRefreshSessionsForUser("u1");
    const call = mockDb.orderBy.mock.calls[0];
    if (!call) throw new Error("Expected orderBy to be called");
    expect(call).toHaveLength(2);
    expect(call[0]).toMatchObject({ type: "desc" });
    expect(call[1]).toMatchObject({ type: "desc" });
  });

  it("uses cursor when provided", async () => {
    mockLimit.mockResolvedValueOnce([]);
    const cursorDate = new Date("2026-01-10T00:00:00.000Z");
    const cursorId = "cursor-id";
    const cursor = Buffer.from(
      `${cursorDate.getTime()}:${cursorId}`,
      "utf8",
    ).toString("base64url");
    await listActiveRefreshSessionsForUser("u1", { limit: 10, cursor });
    const call = mockDb.where.mock.calls[0];
    if (!call) throw new Error("Expected where to be called");
    const whereCall = call[0] as { type: string; args: unknown[] };
    expect(whereCall.type).toBe("and");
    expect(whereCall.args).toHaveLength(5);
    const cursorCondition = whereCall.args[4] as { type: string };
    expect(cursorCondition.type).toBe("or");
  });

  it("returns nextCursor when there are more rows", async () => {
    const rows = Array.from({ length: 3 }, (_, i) => ({
      id: `s${i}`,
      surface: "storefront" as const,
      deviceId: `d${i}`,
      userAgent: "ua",
      createdAt: new Date(2026, 0, 1, 0, 0, i),
      lastSeenAt: new Date(2026, 0, 1, 0, 0, i),
      idleExpiresAt: new Date("2099-01-01"),
      absoluteExpiresAt: new Date("2099-01-01"),
      revokedAt: null,
    }));
    mockLimit.mockResolvedValueOnce(rows);
    const result = await listActiveRefreshSessionsForUser("u1", { limit: 2 });
    expect(result.sessions).toHaveLength(2);
    expect(result.nextCursor).not.toBeNull();
  });

  it("returns null nextCursor on last page", async () => {
    const rows = Array.from({ length: 2 }, (_, i) => ({
      id: `s${i}`,
      surface: "storefront" as const,
      deviceId: `d${i}`,
      userAgent: "ua",
      createdAt: new Date(2026, 0, 1, 0, 0, i),
      lastSeenAt: new Date(2026, 0, 1, 0, 0, i),
      idleExpiresAt: new Date("2099-01-01"),
      absoluteExpiresAt: new Date("2099-01-01"),
      revokedAt: null,
    }));
    mockLimit.mockResolvedValueOnce(rows);
    const result = await listActiveRefreshSessionsForUser("u1", { limit: 2 });
    expect(result.sessions).toHaveLength(2);
    expect(result.nextCursor).toBeNull();
  });

  it("ignores invalid cursor", async () => {
    mockLimit.mockResolvedValueOnce([]);
    await listActiveRefreshSessionsForUser("u1", { cursor: "not-valid" });
    const call = mockDb.where.mock.calls[0];
    if (!call) throw new Error("Expected where to be called");
    const whereCall = call[0] as { type: string; args: unknown[] };
    expect(whereCall.args).toHaveLength(4);
  });
});
