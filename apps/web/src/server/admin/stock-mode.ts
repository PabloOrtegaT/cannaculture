import { createAdminMutationError } from "./mutation-errors";

export type AdminVariantStockMode = "set" | "adjust";

export function resolveVariantStockOnHand(currentStock: number, mode: AdminVariantStockMode, value: number) {
  if (!Number.isInteger(value)) {
    throw createAdminMutationError("validation", "Stock value must be an integer.");
  }

  const nextStock = mode === "set" ? value : currentStock + value;
  if (nextStock < 0) {
    throw createAdminMutationError("validation", "Stock adjustment cannot result in negative inventory.");
  }

  return nextStock;
}
