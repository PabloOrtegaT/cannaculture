DROP TABLE IF EXISTS "session";

CREATE TABLE IF NOT EXISTS "authRefreshSession" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "userId" TEXT NOT NULL,
  "surface" TEXT NOT NULL DEFAULT 'storefront',
  "tokenHash" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "userAgent" TEXT,
  "ipHash" TEXT,
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  "lastSeenAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  "idleExpiresAt" INTEGER NOT NULL,
  "absoluteExpiresAt" INTEGER NOT NULL,
  "revokedAt" INTEGER,
  "rotatedFromId" TEXT,
  FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "auth_refresh_session_token_hash_unique" ON "authRefreshSession" ("tokenHash");
CREATE INDEX IF NOT EXISTS "auth_refresh_session_user_surface_idx" ON "authRefreshSession" ("userId", "surface");
