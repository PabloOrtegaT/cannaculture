import { and, eq, sql } from "drizzle-orm";
import { roleSchema, type Role } from "@base-ecommerce/domain";
import { getRuntimeEnvironment } from "@/server/config/runtime-env";
import { getDb } from "@/server/db/client";
import { passwordResetTokensTable, usersTable, verificationTokensTable } from "@/server/db/schema";
import { AUTH_REDIRECTS, EMAIL_VERIFICATION_WINDOW_MS, PASSWORD_RESET_WINDOW_MS } from "./constants";
import { sendPasswordResetEmail, sendVerificationEmail } from "./email";
import { hashPassword, verifyPassword } from "./password";
import { revokeAllRefreshSessionsForUser } from "./refresh-sessions";
import { createOpaqueToken, createTokenExpiry, isExpired } from "./tokens";

export type AuthSessionUser = {
  id: string;
  email: string;
  name?: string | null;
  role: Role;
  emailVerified: boolean;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function buildAbsoluteUrl(pathname: string, fallbackOrigin?: string) {
  const env = getRuntimeEnvironment();
  const base = env.APP_BASE_URL ?? fallbackOrigin ?? "http://127.0.0.1:3000";
  return new URL(pathname, base).toString();
}

export async function getUserByEmail(email: string) {
  const db = getDb();
  const normalizedEmail = normalizeEmail(email);
  const rows = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail)).limit(1);
  return rows[0] ?? null;
}

export async function getUserById(userId: string) {
  const db = getDb();
  const rows = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  return rows[0] ?? null;
}

async function getUserCount() {
  const db = getDb();
  const rows = await db.select({ count: sql<number>`count(*)` }).from(usersTable).limit(1);
  const rawCount = rows[0]?.count ?? 0;
  return Number(rawCount);
}

export async function registerEmailPasswordUser(input: {
  name: string;
  email: string;
  password: string;
  origin?: string;
}) {
  const db = getDb();
  const normalizedEmail = normalizeEmail(input.email);
  const existing = await getUserByEmail(normalizedEmail);
  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  const isFirstUser = (await getUserCount()) === 0;
  const role: Role = isFirstUser ? "owner" : "catalog";
  const now = new Date();

  const [inserted] = await db
    .insert(usersTable)
    .values({
      id: crypto.randomUUID(),
      name: input.name.trim(),
      email: normalizedEmail,
      role,
      passwordHash: await hashPassword(input.password),
      emailVerified: null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!inserted) {
    throw new Error("Failed to create user.");
  }

  const token = createOpaqueToken();
  const expires = createTokenExpiry(EMAIL_VERIFICATION_WINDOW_MS);

  await db.insert(verificationTokensTable).values({
    identifier: `verify:${inserted.id}`,
    token,
    expires,
  });

  await sendVerificationEmail(normalizedEmail, buildAbsoluteUrl(`/api/auth/verify?token=${token}`, input.origin));

  return {
    userId: inserted.id,
    email: normalizedEmail,
    verificationSent: true,
    redirectTo: `${AUTH_REDIRECTS.login}?registered=1`,
  };
}

export async function verifyEmailByToken(token: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(verificationTokensTable)
    .where(eq(verificationTokensTable.token, token))
    .limit(1);

  const row = rows[0];
  if (!row || !row.identifier.startsWith("verify:")) {
    return { ok: false, redirectTo: AUTH_REDIRECTS.verifyFailed };
  }

  if (isExpired(row.expires)) {
    await db
      .delete(verificationTokensTable)
      .where(and(eq(verificationTokensTable.identifier, row.identifier), eq(verificationTokensTable.token, row.token)));
    return { ok: false, redirectTo: AUTH_REDIRECTS.verifyFailed };
  }

  const userId = row.identifier.replace("verify:", "");
  await db
    .update(usersTable)
    .set({
      emailVerified: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(usersTable.id, userId));

  await db
    .delete(verificationTokensTable)
    .where(and(eq(verificationTokensTable.identifier, row.identifier), eq(verificationTokensTable.token, row.token)));

  return { ok: true, redirectTo: AUTH_REDIRECTS.verifySuccess };
}

export async function requestPasswordReset(email: string, origin?: string) {
  const db = getDb();
  const user = await getUserByEmail(email);
  if (!user) {
    return { ok: true, redirectTo: AUTH_REDIRECTS.resetRequestSuccess };
  }

  const token = createOpaqueToken();
  const expires = createTokenExpiry(PASSWORD_RESET_WINDOW_MS);

  await db.delete(passwordResetTokensTable).where(eq(passwordResetTokensTable.userId, user.id));
  await db.insert(passwordResetTokensTable).values({
    token,
    userId: user.id,
    expires,
    createdAt: new Date(),
  });

  await sendPasswordResetEmail(user.email ?? normalizeEmail(email), buildAbsoluteUrl(`/reset-password?token=${token}`, origin));
  return { ok: true, redirectTo: AUTH_REDIRECTS.resetRequestSuccess };
}

export async function resetPasswordByToken(token: string, nextPassword: string) {
  const db = getDb();
  const rows = await db.select().from(passwordResetTokensTable).where(eq(passwordResetTokensTable.token, token)).limit(1);
  const entry = rows[0];
  if (!entry || isExpired(entry.expires)) {
    return { ok: false as const, message: "Reset token is invalid or expired." };
  }

  await db
    .update(usersTable)
    .set({
      passwordHash: await hashPassword(nextPassword),
      updatedAt: new Date(),
    })
    .where(eq(usersTable.id, entry.userId));

  await db.delete(passwordResetTokensTable).where(eq(passwordResetTokensTable.token, token));

  // F3-1: revoke all refresh sessions for this user so surviving attacker sessions die.
  await revokeAllRefreshSessionsForUser(entry.userId);

  return { ok: true as const, redirectTo: AUTH_REDIRECTS.resetSuccess };
}

export async function validateCredentials(email: string, password: string): Promise<AuthSessionUser | null> {
  const user = await getUserByEmail(email);
  if (!user?.passwordHash || !user.email) {
    return null;
  }

  const passwordIsValid = await verifyPassword(password, user.passwordHash);
  if (!passwordIsValid) {
    return null;
  }

  if (!user.emailVerified) {
    throw new Error("EMAIL_NOT_VERIFIED");
  }

  const role = roleSchema.parse(user.role);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role,
    emailVerified: Boolean(user.emailVerified),
  };
}
