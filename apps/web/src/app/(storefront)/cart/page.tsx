import type { Metadata } from "next";
import { CartView } from "@/components/storefront/cart-view";

export const metadata: Metadata = {
  title: "Cart | Base Ecommerce",
  description: "Review your selected products and quantities.",
};

export default function CartPage() {
  return <CartView />;
}
