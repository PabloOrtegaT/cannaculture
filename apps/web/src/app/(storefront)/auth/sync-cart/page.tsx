import { redirect } from "next/navigation";
import { CartSyncClient } from "@/components/auth/cart-sync-client";
import { getSessionUser } from "@/server/auth/session";

export default async function SyncCartPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-10">
      <CartSyncClient />
    </main>
  );
}

