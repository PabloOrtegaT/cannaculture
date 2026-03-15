import { roleSchema, type Permission, type Role, canRolePerform } from "@base-ecommerce/domain";
import { cookies, headers } from "next/headers";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { resolveHostPolicy, resolveSurfaceForHost } from "@/server/config/host-policy";
import { getHostRuntimeConfig } from "@/server/config/runtime-env";
import { getActiveRefreshSessionByToken, isActiveRefreshSessionForUser, touchRefreshSessionById } from "./refresh-sessions";
import { readRefreshTokenFromCookieStore } from "./refresh-cookie";
import { getUserById } from "./service";
import { getAuthOptions } from "./options";

export async function getSession() {
  return getServerSession(getAuthOptions());
}

export type SessionUser = {
  id: string;
  email: string;
  role: Role;
  name?: string | null;
  emailVerified: boolean;
  sid?: string;
  authenticatedAt: Date;
};

function sessionDateFromIso(rawDate?: string | null) {
  if (!rawDate) {
    return new Date();
  }
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
}

async function getRefreshSessionUser() {
  const headerStore = await headers();
  const cookieStore = await cookies();

  const hostConfig = getHostRuntimeConfig();
  const hostPolicy = resolveHostPolicy({
    appBaseUrl: hostConfig.appBaseUrl,
    adminBaseUrl: hostConfig.adminBaseUrl,
  });
  const requestHost = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const surface = resolveSurfaceForHost(hostPolicy, requestHost ?? "");
  const refreshToken = readRefreshTokenFromCookieStore(cookieStore, surface);
  if (!refreshToken) {
    return null;
  }

  const refreshSession = await getActiveRefreshSessionByToken(refreshToken);
  if (!refreshSession) {
    return null;
  }

  const user = await getUserById(refreshSession.userId);
  if (!user?.email) {
    return null;
  }

  await touchRefreshSessionById(refreshSession.id);

  return {
    id: user.id,
    email: user.email,
    role: roleSchema.parse(user.role),
    name: user.name,
    emailVerified: Boolean(user.emailVerified),
    sid: refreshSession.id,
    authenticatedAt: refreshSession.createdAt,
  } satisfies SessionUser;
}

export async function getSessionUser() {
  const refreshSessionUser = await getRefreshSessionUser();
  if (refreshSessionUser) {
    return refreshSessionUser;
  }

  const session = await getSession();
  if (!session?.user?.id || !session.user.email) {
    return null;
  }

  const parsedRole = roleSchema.safeParse(session.user.role);
  if (!parsedRole.success) {
    return null;
  }

  if (session.user.sid) {
    const active = await isActiveRefreshSessionForUser(session.user.id, session.user.sid);
    if (!active) {
      return null;
    }
    await touchRefreshSessionById(session.user.sid);
  }

  return {
    id: session.user.id,
    email: session.user.email,
    role: parsedRole.data,
    name: session.user.name,
    emailVerified: Boolean(session.user.emailVerified),
    sid: session.user.sid,
    authenticatedAt: sessionDateFromIso(session.user.authenticatedAt),
  };
}

export async function requireSessionUser(options?: { redirectTo?: string }) {
  const user = await getSessionUser();
  if (!user) {
    redirect(options?.redirectTo ?? "/login");
  }
  return user;
}

export async function requireRoleForPermission(permission: Permission): Promise<Role> {
  const user = await requireSessionUser();
  if (!canRolePerform(user.role, permission)) {
    throw new Error(`Role ${user.role} cannot perform action "${permission}".`);
  }
  return user.role;
}
