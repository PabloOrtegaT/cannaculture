import { categoryTemplateKeySchema, type CategoryTemplateKey } from "../catalog/schemas";

export const storeProfileSchema = categoryTemplateKeySchema;
export type StoreProfile = CategoryTemplateKey;

export const defaultStoreProfile: StoreProfile = "plant-seeds";

export function resolveStoreProfile(input?: string | null): StoreProfile {
  if (!input) {
    return defaultStoreProfile;
  }

  return storeProfileSchema.parse(input);
}
