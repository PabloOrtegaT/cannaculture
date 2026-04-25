"use client";

import { Button, Badge } from "@cannaculture/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LogIn, LogOut, LayoutDashboard, User, ShoppingCart } from "lucide-react";
import { useCartStore } from "@/features/cart/cart-store";
import type { CartState } from "@/features/cart/cart";
import { runSingleFlight } from "@/lib/single-flight";

type ViewerResponse = {
  authenticated: boolean;
  email?: string;
  role?: "owner" | "manager" | "catalog";
  isAdmin?: boolean;
};

export function StorefrontAuthLinks() {
  const [viewer, setViewer] = useState<ViewerResponse | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const setCartAuthState = useCartStore((state) => state.setAuthState);
  const hydrateCart = useCartStore((state) => state.hydrateCart);
  const cartItems = useCartStore((state) => state.cart.items);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setting mounted flag after hydration is intentional; avoids server/client mismatch on cart badge
    setHydrated(true);
  }, []);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        const payload = await runSingleFlight<ViewerResponse | null>("auth-viewer", async () => {
          const response = await fetch("/api/auth/viewer", {
            method: "GET",
            cache: "no-store",
          });
          if (!response.ok) {
            return null;
          }
          return (await response.json()) as ViewerResponse;
        });
        if (!active) {
          return;
        }
        if (!payload) {
          setCartAuthState(false);
          setViewer({ authenticated: false });
          return;
        }
        setCartAuthState(payload.authenticated);
        if (payload.authenticated) {
          const cartSnapshot = await runSingleFlight<{ cart: CartState; version: number } | null>(
            "cart-snapshot",
            async () => {
              const cartResponse = await fetch("/api/cart", {
                method: "GET",
                cache: "no-store",
              });
              if (!cartResponse.ok) {
                return null;
              }
              return (await cartResponse.json()) as { cart: CartState; version: number };
            },
          );

          if (active && cartSnapshot) {
            hydrateCart(cartSnapshot.cart, { version: cartSnapshot.version });
          }
        }
        setViewer(payload);
      } catch {
        if (active) {
          setCartAuthState(false);
          setViewer({ authenticated: false });
        }
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [hydrateCart, setCartAuthState]);

  return (
    <div className="flex items-center gap-1">
      {/* Cart icon with badge */}
      <Button variant="ghost" size="icon" asChild className="relative">
        <Link href="/cart" aria-label="Cart">
          <ShoppingCart className="h-4 w-4" />
          {hydrated && totalItems > 0 && (
            <Badge
              variant="default"
              className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full px-1 text-[10px] leading-none flex items-center justify-center"
            >
              {totalItems > 99 ? "99+" : totalItems}
            </Badge>
          )}
        </Link>
      </Button>

      {/* Auth actions */}
      {!viewer || !viewer.authenticated ? (
        <Button variant="ghost" size="sm" asChild>
          <Link href="/login">
            <LogIn className="h-4 w-4" />
            Sign in
          </Link>
        </Button>
      ) : (
        <>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/account" aria-label="Account">
              <User className="h-4 w-4" />
            </Link>
          </Button>
          {viewer.isAdmin && (
            <Button variant="ghost" size="icon" asChild>
              <a href="/admin" aria-label="Admin">
                <LayoutDashboard className="h-4 w-4" />
              </a>
            </Button>
          )}
          <Button variant="ghost" size="icon" asChild>
            <Link href="/logout" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Link>
          </Button>
        </>
      )}
    </div>
  );
}
