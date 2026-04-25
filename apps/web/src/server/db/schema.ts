import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { Role } from "@cannaculture/domain";

const nowSql = sql`(unixepoch('now') * 1000)`;

export const usersTable = sqliteTable("user", {
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
});

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

export const inventoryStocksTable = sqliteTable(
  "inventoryStock",
  {
    variantId: text("variantId").primaryKey(),
    onHandQty: integer("onHandQty").notNull(),
    availableQty: integer("availableQty").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull().default(nowSql),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull().default(nowSql),
  },
  (table) => ({
    availableIdx: index("inventory_stock_available_idx").on(table.availableQty),
  }),
);

export const inventoryHoldsTable = sqliteTable(
  "inventoryHold",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orderId: text("orderId")
      .notNull()
      .references(() => ordersTable.id, { onDelete: "cascade" }),
    variantId: text("variantId").notNull(),
    quantity: integer("quantity").notNull(),
    expiresAt: integer("expiresAt", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull().default(nowSql),
  },
  (table) => ({
    orderIdx: index("inventory_hold_order_idx").on(table.orderId),
    expiresAtIdx: index("inventory_hold_expires_at_idx").on(table.expiresAt),
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

export const ordersTable = sqliteTable(
  "order",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    orderNumber: text("orderNumber").notNull(),
    status: text("status").notNull().default("pending_payment"),
    paymentStatus: text("paymentStatus").notNull().default("pending"),
    paymentProvider: text("paymentProvider"),
    paymentSessionId: text("paymentSessionId"),
    paymentReference: text("paymentReference"),
    currency: text("currency").notNull(),
    subtotalCents: integer("subtotalCents").notNull(),
    discountCents: integer("discountCents").notNull().default(0),
    shippingCents: integer("shippingCents").notNull().default(0),
    totalCents: integer("totalCents").notNull(),
    itemCount: integer("itemCount").notNull(),
    couponCode: text("couponCode"),
    couponSnapshot: text("couponSnapshot"),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull().default(nowSql),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull().default(nowSql),
  },
  (table) => ({
    orderNumberIdx: uniqueIndex("order_order_number_unique").on(table.orderNumber),
    paymentSessionIdx: uniqueIndex("order_payment_session_unique").on(table.paymentSessionId),
    userCreatedAtIdx: index("order_user_created_at_idx").on(table.userId, table.createdAt),
  }),
);

export const orderItemsTable = sqliteTable(
  "orderItem",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orderId: text("orderId")
      .notNull()
      .references(() => ordersTable.id, { onDelete: "cascade" }),
    productId: text("productId").notNull(),
    variantId: text("variantId").notNull(),
    name: text("name").notNull(),
    variantName: text("variantName").notNull(),
    href: text("href").notNull(),
    currency: text("currency").notNull(),
    unitPriceCents: integer("unitPriceCents").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotalCents: integer("lineTotalCents").notNull(),
    unavailableReason: text("unavailableReason"),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull().default(nowSql),
  },
  (table) => ({
    orderIdx: index("order_item_order_idx").on(table.orderId),
  }),
);

export const orderStatusTimelineTable = sqliteTable(
  "orderStatusTimeline",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orderId: text("orderId")
      .notNull()
      .references(() => ordersTable.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    actorType: text("actorType").notNull().default("system"),
    actorId: text("actorId"),
    note: text("note"),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull().default(nowSql),
  },
  (table) => ({
    orderCreatedIdx: index("order_status_timeline_order_created_idx").on(table.orderId, table.createdAt),
  }),
);

export const paymentAttemptsTable = sqliteTable(
  "paymentAttempt",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orderId: text("orderId")
      .notNull()
      .references(() => ordersTable.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerSessionId: text("providerSessionId").notNull(),
    status: text("status").notNull().default("created"),
    checkoutUrl: text("checkoutUrl"),
    amountCents: integer("amountCents").notNull(),
    currency: text("currency").notNull(),
    errorCode: text("errorCode"),
    errorMessage: text("errorMessage"),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull().default(nowSql),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull().default(nowSql),
  },
  (table) => ({
    providerSessionIdx: uniqueIndex("payment_attempt_provider_session_unique").on(table.provider, table.providerSessionId),
    orderIdx: index("payment_attempt_order_idx").on(table.orderId),
  }),
);

export const paymentWebhookEventsTable = sqliteTable(
  "paymentWebhookEvent",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    provider: text("provider").notNull(),
    eventId: text("eventId").notNull(),
    eventType: text("eventType").notNull(),
    orderId: text("orderId").references(() => ordersTable.id, { onDelete: "set null" }),
    payload: text("payload").notNull(),
    outcome: text("outcome").notNull().default("received"),
    receivedAt: integer("receivedAt", { mode: "timestamp_ms" }).notNull().default(nowSql),
    processedAt: integer("processedAt", { mode: "timestamp_ms" }),
  },
  (table) => ({
    providerEventIdx: uniqueIndex("payment_webhook_event_provider_event_unique").on(table.provider, table.eventId),
    orderIdx: index("payment_webhook_event_order_idx").on(table.orderId),
  }),
);

export const couponRedemptionsTable = sqliteTable(
  "couponRedemption",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    couponId: text("couponId").notNull(),
    orderId: text("orderId")
      .notNull()
      .references(() => ordersTable.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull().default(nowSql),
  },
  (table) => ({
    couponOrderUnique: uniqueIndex("coupon_redemption_coupon_order_unique").on(table.couponId, table.orderId),
    couponUserIdx: index("coupon_redemption_coupon_user_idx").on(table.couponId, table.userId),
  }),
);

export type DbUser = typeof usersTable.$inferSelect;
