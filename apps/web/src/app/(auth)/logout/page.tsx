"use client";

import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";
import { emptyCartState } from "@/features/cart/cart";
import { useCartStore } from "@/features/cart/cart-store";

export default function LogoutPage() {
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) {
      return;
    }
    hasStarted.current = true;

    const run = async () => {
      useCartStore.getState().hydrateCart(emptyCartState);

      await Promise.race([
        fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined),
        new Promise((resolve) => setTimeout(resolve, 4000)),
      ]);

      const signOutResult = await Promise.race([
        signOut({ callbackUrl: "/", redirect: false }),
        new Promise<{ url?: string }>((resolve) => setTimeout(() => resolve({ url: "/" }), 4000)),
      ]);

      window.location.replace(signOutResult?.url ?? "/");
    };
    void run();
  }, []);

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-10">
      <p className="text-sm text-muted-foreground">Signing out...</p>
    </main>
  );
}
