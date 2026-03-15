"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

export default function LogoutPage() {
  useEffect(() => {
    const run = async () => {
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
      await signOut({ callbackUrl: "/" });
    };
    run();
  }, []);

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-10">
      <p className="text-sm text-muted-foreground">Signing out...</p>
    </main>
  );
}
