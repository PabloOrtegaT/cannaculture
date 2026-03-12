import { roleSchema, type Role } from "@base-ecommerce/domain";

export const ADMIN_ROLE_ENV_KEY = "ADMIN_ROLE";
export const defaultAdminRole: Role = "owner";

export function resolveAdminRole(input?: string | null): Role {
  if (!input) {
    return defaultAdminRole;
  }

  return roleSchema.parse(input);
}

export function getAdminRole(env: NodeJS.ProcessEnv = process.env): Role {
  try {
    return resolveAdminRole(env[ADMIN_ROLE_ENV_KEY]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown validation error.";
    throw new Error(
      `Invalid ${ADMIN_ROLE_ENV_KEY} value "${env[ADMIN_ROLE_ENV_KEY]}". ` +
        `Expected one of: owner, manager, catalog. ${message}`,
    );
  }
}
