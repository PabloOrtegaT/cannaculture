CREATE TABLE IF NOT EXISTS "user" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT,
  "email" TEXT,
  "emailVerified" INTEGER,
  "image" TEXT,
  "role" TEXT NOT NULL DEFAULT 'catalog',
  "passwordHash" TEXT,
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  "updatedAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_email_unique" ON "user" ("email");

CREATE TABLE IF NOT EXISTS "account" (
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  PRIMARY KEY ("provider", "providerAccountId"),
  FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "session" (
  "sessionToken" TEXT PRIMARY KEY NOT NULL,
  "userId" TEXT NOT NULL,
  "expires" INTEGER NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "verificationToken" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires" INTEGER NOT NULL,
  PRIMARY KEY ("identifier", "token")
);

CREATE TABLE IF NOT EXISTS "passwordResetToken" (
  "token" TEXT PRIMARY KEY NOT NULL,
  "userId" TEXT NOT NULL,
  "expires" INTEGER NOT NULL,
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_token_user_id_unique" ON "passwordResetToken" ("userId");

CREATE TABLE IF NOT EXISTS "cart" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  "updatedAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "cart_user_id_unique" ON "cart" ("userId");

CREATE TABLE IF NOT EXISTS "cartItem" (
  "cartId" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "variantName" TEXT NOT NULL,
  "href" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "unitPriceCents" INTEGER NOT NULL,
  "stockOnHand" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unavailableReason" TEXT,
  "updatedAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  PRIMARY KEY ("cartId", "variantId"),
  FOREIGN KEY ("cartId") REFERENCES "cart" ("id") ON DELETE CASCADE
);

