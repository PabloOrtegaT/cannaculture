import crypto from "node:crypto";
import { and, desc, eq, gt, isNull, lt, or } from "drizzle-orm";
import type { HostSurface } from "@/server/config/host-policy";
import { getAuthRuntimeConfig } from "@/server/config/runtime-env";
import { getDb } from "@/server/db/client";
import { authRefreshSessionsTable } from "@/server/db/schema";
import { createOpaqueToken } from "./tokens";
import { getRefreshWindowMs } from "./refresh-session-policy";

type RefreshContext = {
  userAgent?: string | null | undefined;
  ipAddress?: string | null | undefined;
  deviceId?: string | null | undefined;
};

function nowDate() {
  return new Date();
}

function hashWithSecret(value: string, secret: string) {
  return crypto.createHash("sha256").update(`${secret}:${value}`).digest("hex");
}

function hashRefreshToken(token: string, surface: HostSurface) {
  const config = getAuthRuntimeConfig();
  const secret = surface === "admin" ? config.adminRefreshTokenSecret : config.refreshTokenSecret;
  return hashWithSecret(token, secret);
}

function hashIpAddress(ipAddress?: string | null) {
  if (!ipAddress) {
    return null;
  }
  return hashWithSecret(ipAddress, getAuthRuntimeConfig().refreshTokenSecret);
}

function buildSessionDeviceId(context: RefreshContext) {
  if (context.deviceId && context.deviceId.trim().length > 0) {
    return context.deviceId.trim();
  }
  return crypto.randomUUID();
}

function isRefreshSessionExpired(row: typeof authRefreshSessionsTable.$inferSelect) {
  const now = Date.now();
  return row.idleExpiresAt.getTime() <= now || row.absoluteExpiresAt.getTime() <= now;
}

export async function createRefreshSession(
  userId: string,
  surface: HostSurface,
  context: RefreshContext = {},
  rotatedFromId?: string,
) {
  const db = getDb();
  const now = nowDate();
  const windowMs = getRefreshWindowMs(surface);
  const rawToken = createOpaqueToken();
  const tokenHash = hashRefreshToken(rawToken, surface);

  const [created] = await db
    .insert(authRefreshSessionsTable)
    .values({
      id: crypto.randomUUID(),
      userId,
      surface,
      tokenHash,
      deviceId: buildSessionDeviceId(context),
      userAgent: context.userAgent ?? null,
      ipHash: hashIpAddress(context.ipAddress),
      createdAt: now,
      lastSeenAt: now,
      idleExpiresAt: new Date(now.getTime() + windowMs.idleMs),
      absoluteExpiresAt: new Date(now.getTime() + windowMs.absoluteMs),
      revokedAt: null,
      rotatedFromId: rotatedFromId ?? null,
    })
    .returning();

  if (!created) {
    throw new Error("Could not create refresh session.");
  }

  return {
    rawToken,
    session: created,
  };
}

export async function getActiveRefreshSessionByToken(rawToken: string) {
  const db = getDb();
  const storefrontHash = hashRefreshToken(rawToken, "storefront");
  const adminHash = hashRefreshToken(rawToken, "admin");
  const rows = await db
    .select()
    .from(authRefreshSessionsTable)
    .where(
      and(
        or(eq(authRefreshSessionsTable.tokenHash, storefrontHash), eq(authRefreshSessionsTable.tokenHash, adminHash)),
        isNull(authRefreshSessionsTable.revokedAt),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) {
    return null;
  }

  if (isRefreshSessionExpired(row)) {
    await db
      .update(authRefreshSessionsTable)
      .set({
        revokedAt: nowDate(),
      })
      .where(eq(authRefreshSessionsTable.id, row.id));
    return null;
  }

  return row;
}

export async function getActiveRefreshSessionById(sessionId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(authRefreshSessionsTable)
    .where(and(eq(authRefreshSessionsTable.id, sessionId), isNull(authRefreshSessionsTable.revokedAt)))
    .limit(1);
  const row = rows[0];
  if (!row) {
    return null;
  }
  if (isRefreshSessionExpired(row)) {
    await db
      .update(authRefreshSessionsTable)
      .set({
        revokedAt: nowDate(),
      })
      .where(eq(authRefreshSessionsTable.id, row.id));
    return null;
  }
  return row;
}

async function revokeRefreshSession(sessionId: string) {
  const db = getDb();
  await db
    .update(authRefreshSessionsTable)
    .set({
      revokedAt: nowDate(),
    })
    .where(eq(authRefreshSessionsTable.id, sessionId));
}

export async function rotateRefreshSessionByToken(rawToken: string, context: RefreshContext = {}) {
  const row = await getActiveRefreshSessionByToken(rawToken);
  if (!row) {
    return null;
  }
  await revokeRefreshSession(row.id);

  return createRefreshSession(
    row.userId,
    row.surface === "admin" ? "admin" : "storefront",
    {
      userAgent: context.userAgent ?? row.userAgent,
      ipAddress: context.ipAddress,
      deviceId: row.deviceId,
    },
    row.id,
  );
}

export async function rotateRefreshSessionById(sessionId: string, context: RefreshContext = {}) {
  const row = await getActiveRefreshSessionById(sessionId);
  if (!row) {
    return null;
  }
  await revokeRefreshSession(row.id);
  return createRefreshSession(
    row.userId,
    row.surface === "admin" ? "admin" : "storefront",
    {
      userAgent: context.userAgent ?? row.userAgent,
      ipAddress: context.ipAddress,
      deviceId: row.deviceId,
    },
    row.id,
  );
}

export async function revokeRefreshSessionByToken(rawToken: string) {
  const row = await getActiveRefreshSessionByToken(rawToken);
  if (!row) {
    return false;
  }
  await revokeRefreshSession(row.id);
  return true;
}

export async function revokeRefreshSessionByIdForUser(sessionId: string, userId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(authRefreshSessionsTable)
    .where(
      and(
        eq(authRefreshSessionsTable.id, sessionId),
        eq(authRefreshSessionsTable.userId, userId),
        isNull(authRefreshSessionsTable.revokedAt),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) {
    return false;
  }
  await revokeRefreshSession(row.id);
  return true;
}

export async function revokeAllRefreshSessionsForUser(userId: string) {
  const db = getDb();
  await db
    .update(authRefreshSessionsTable)
    .set({
      revokedAt: nowDate(),
    })
    .where(and(eq(authRefreshSessionsTable.userId, userId), isNull(authRefreshSessionsTable.revokedAt)));
}

function encodeCursor(createdAt: Date, id: string): string {
  const payload = `${createdAt.getTime()}:${id}`;
  return Buffer.from(payload, "utf8").toString("base64url");
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
  try {
    const payload = Buffer.from(cursor, "base64url").toString("utf8");
    const sepIndex = payload.indexOf(":");
    if (sepIndex === -1) return null;
    const timestamp = Number(payload.slice(0, sepIndex));
    if (!Number.isFinite(timestamp)) return null;
    const id = payload.slice(sepIndex + 1);
    return { createdAt: new Date(timestamp), id };
  } catch {
    return null;
  }
}

export async function listActiveRefreshSessionsForUser(
  userId: string,
  options?: { limit?: number; cursor?: string },
) {
  const db = getDb();
  const now = nowDate();
  const pageLimit = Math.min(Math.max(1, options?.limit ?? 50), 100);

  const conditions = [
    eq(authRefreshSessionsTable.userId, userId),
    isNull(authRefreshSessionsTable.revokedAt),
    gt(authRefreshSessionsTable.idleExpiresAt, now),
    gt(authRefreshSessionsTable.absoluteExpiresAt, now),
  ];

  if (options?.cursor) {
    const decoded = decodeCursor(options.cursor);
    if (decoded) {
      conditions.push(
        or(
          lt(authRefreshSessionsTable.createdAt, decoded.createdAt),
          and(
            eq(authRefreshSessionsTable.createdAt, decoded.createdAt),
            lt(authRefreshSessionsTable.id, decoded.id),
          )!,
        )!,
      );
    }
  }

  const rows = await db
    .select()
    .from(authRefreshSessionsTable)
    .where(and(...conditions))
    .orderBy(desc(authRefreshSessionsTable.createdAt), desc(authRefreshSessionsTable.id))
    .limit(pageLimit + 1);

  const hasMore = rows.length > pageLimit;
  const sessions = (hasMore ? rows.slice(0, pageLimit) : rows).map((row) => ({
    id: row.id,
    surface: row.surface,
    deviceId: row.deviceId,
    userAgent: row.userAgent,
    createdAt: row.createdAt,
    lastSeenAt: row.lastSeenAt,
    idleExpiresAt: row.idleExpiresAt,
    absoluteExpiresAt: row.absoluteExpiresAt,
  }));

  const lastSession = sessions[sessions.length - 1];
  const nextCursor =
    hasMore && lastSession ? encodeCursor(lastSession.createdAt, lastSession.id) : null;

  return { sessions, nextCursor };
}

export async function isActiveRefreshSessionForUser(userId: string, sessionId: string) {
  const row = await getActiveRefreshSessionById(sessionId);
  if (!row) {
    return false;
  }
  return row.userId === userId;
}

export async function touchRefreshSessionById(sessionId: string) {
  const db = getDb();
  const row = await getActiveRefreshSessionById(sessionId);
  if (!row) {
    return;
  }
  const now = nowDate();
  const windowMs = getRefreshWindowMs(row.surface === "admin" ? "admin" : "storefront");
  const nextIdle = new Date(now.getTime() + windowMs.idleMs);
  const nextIdleExpiry = nextIdle.getTime() > row.absoluteExpiresAt.getTime() ? row.absoluteExpiresAt : nextIdle;
  await db
    .update(authRefreshSessionsTable)
    .set({
      lastSeenAt: now,
      idleExpiresAt: nextIdleExpiry,
    })
    .where(and(eq(authRefreshSessionsTable.id, sessionId), isNull(authRefreshSessionsTable.revokedAt)));
}
