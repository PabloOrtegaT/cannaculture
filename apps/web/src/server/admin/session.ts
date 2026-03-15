import { roleSchema, type Role } from "@base-ecommerce/domain";
import { getSessionUser, requireSessionUser } from "@/server/auth/session";
import { assertAdminHostAccess } from "./role-guard";

export async function getAdminRole(): Promise<Role | null> {
  await assertAdminHostAccess();
  const user = await getSessionUser();
  if (!user) {
    return null;
  }
  return roleSchema.parse(user.role);
}

export async function requireAdminRole(): Promise<Role> {
  await assertAdminHostAccess();
  const user = await requireSessionUser();
  return roleSchema.parse(user.role);
}
