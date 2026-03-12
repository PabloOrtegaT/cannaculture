import { resolveStoreProfile, type StoreProfile } from "@base-ecommerce/domain";

export const STORE_PROFILE_ENV_KEY = "STORE_PROFILE";

export function getActiveStoreProfile(env: NodeJS.ProcessEnv = process.env): StoreProfile {
  try {
    return resolveStoreProfile(env[STORE_PROFILE_ENV_KEY]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown validation error.";
    throw new Error(
      `Invalid ${STORE_PROFILE_ENV_KEY} value "${env[STORE_PROFILE_ENV_KEY]}". ` +
        `Expected one of: prints-3d, pc-components, plant-seeds. ${message}`,
    );
  }
}
