import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { Role } from "@base-ecommerce/domain";

const nowSql = sql`(unixepoch('now') * 1000)`;

export const usersTable = sqliteTable(
  "user",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name"),
    email: text("email").unique(),
    emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
    image: text("image"),
    role: text("role").$type<Role>().notNull().default("catalog"),
    passwordHash: text("passwordHash"),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull().default(nowSql),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull().default(nowSql),
  },
  (table) => ({
    emailIdx: uniqueIndex("user_email_unique").on(table.email),
  }),
);

export const accountsTable = sqliteTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => ({
    compositePk: primaryKey({
      columns: [table.provider, table.providerAccountId],
    }),
  }),
);

export const verificationTokensTable = sqliteTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    compositePk: primaryKey({
      columns: [table.identifier, table.token],
    }),
  }),
);

export const passwordResetTokensTable = sqliteTable(
  "passwordResetToken",
  {
    token: text("token").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull().default(nowSql),
  },
  (table) => ({
    userIdx: uniqueIndex("password_reset_token_user_id_unique").on(table.userId),
  }),
);

export const cartsTable = sqliteTable(
  "cart",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull().default(nowSql),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull().default(nowSql),
  },
  (table) => ({
    userIdx: uniqueIndex("cart_user_id_unique").on(table.userId),
  }),
);

export const cartItemsTable = sqliteTable(
  "cartItem",
  {
    cartId: text("cartId")
      .notNull()
      .references(() => cartsTable.id, { onDelete: "cascade" }),
    variantId: text("variantId").notNull(),
    productId: text("productId").notNull(),
    name: text("name").notNull(),
    variantName: text("variantName").notNull(),
    href: text("href").notNull(),
    currency: text("currency").notNull(),
    unitPriceCents: integer("unitPriceCents").notNull(),
    stockOnHand: integer("stockOnHand").notNull(),
    quantity: integer("quantity").notNull(),
    unavailableReason: text("unavailableReason"),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull().default(nowSql),
  },
  (table) => ({
    compositePk: primaryKey({
      columns: [table.cartId, table.variantId],
    }),
  }),
);

export const authRefreshSessionsTable = sqliteTable(
  "authRefreshSession",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    surface: text("surface").notNull().default("storefront"),
    tokenHash: text("tokenHash").notNull(),
    deviceId: text("deviceId").notNull(),
    userAgent: text("userAgent"),
    ipHash: text("ipHash"),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull().default(nowSql),
    lastSeenAt: integer("lastSeenAt", { mode: "timestamp_ms" }).notNull().default(nowSql),
    idleExpiresAt: integer("idleExpiresAt", { mode: "timestamp_ms" }).notNull(),
    absoluteExpiresAt: integer("absoluteExpiresAt", { mode: "timestamp_ms" }).notNull(),
    revokedAt: integer("revokedAt", { mode: "timestamp_ms" }),
    rotatedFromId: text("rotatedFromId"),
  },
  (table) => ({
    tokenHashIdx: uniqueIndex("auth_refresh_session_token_hash_unique").on(table.tokenHash),
    userSurfaceIdx: index("auth_refresh_session_user_surface_idx").on(table.userId, table.surface),
  }),
);

export type DbUser = typeof usersTable.$inferSelect;
