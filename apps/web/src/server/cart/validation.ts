import { z } from "zod";
import type { CartItem, CartState } from "@/features/cart/cart";

const cartItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  name: z.string().min(1),
  variantName: z.string().min(1),
  href: z.string().min(1),
  currency: z.enum(["MXN", "USD"]),
  unitPriceCents: z.number().int().min(0),
  stockOnHand: z.number().int().min(0),
  quantity: z.number().int().min(0),
  unavailableReason: z.string().min(1).optional(),
}).transform((value) => ({
  ...value,
  ...(value.unavailableReason ? { unavailableReason: value.unavailableReason } : {}),
}));

export const cartStateSchema = z.object({
  items: z.array(cartItemSchema),
});

export const cartWritePayloadSchema = z.union([
  cartStateSchema,
  z.object({
    cart: cartStateSchema,
    version: z.number().int().nonnegative().optional(),
  }),
]);

export function normalizeParsedCartState(parsed: z.infer<typeof cartStateSchema>): CartState {
  return {
    items: parsed.items.map((item): CartItem => {
      const normalized: Omit<CartItem, "unavailableReason"> = {
        productId: item.productId,
        variantId: item.variantId,
        name: item.name,
        variantName: item.variantName,
        href: item.href,
        currency: item.currency,
        unitPriceCents: item.unitPriceCents,
        stockOnHand: item.stockOnHand,
        quantity: item.quantity,
      };

      if (item.unavailableReason) {
        return {
          ...normalized,
          unavailableReason: item.unavailableReason,
        };
      }

      return normalized;
    }),
  };
}

export function normalizeCartWritePayload(parsed: z.infer<typeof cartWritePayloadSchema>): {
  cart: CartState;
  version?: number;
} {
  if ("cart" in parsed) {
    return {
      cart: normalizeParsedCartState(parsed.cart),
      ...(typeof parsed.version === "number" ? { version: parsed.version } : {}),
    };
  }

  return {
    cart: normalizeParsedCartState(parsed),
  };
}
