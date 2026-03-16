import { roleSchema, type Role } from "@base-ecommerce/domain";
import { getSessionUser, requireSessionUser } from "@/server/auth/session";
import { assertAdminHostAccess, isAdminRole } from "./role-guard";

export async function getAdminRole(): Promise<Role | null> {
  await assertAdminHostAccess();
  const user = await getSessionUser();
  if (!user) {
    return null;
  }
  const role = roleSchema.parse(user.role);
  if (!isAdminRole(role)) {
    return null;
  }
  return role;
}

export async function requireAdminRole(): Promise<Role> {
  await assertAdminHostAccess();
  const user = await requireSessionUser();
  const role = roleSchema.parse(user.role);
  if (!isAdminRole(role)) {
    throw new Error(`Role ${role} cannot access admin.`);
  }
  return role;
}
