import { redirect } from "next/navigation";
import { CartSyncClient } from "@/components/auth/cart-sync-client";
import { getSessionUser } from "@/server/auth/session";

type SyncCartPageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

function normalizeNextPath(input?: string) {
  if (!input || !input.startsWith("/")) {
    return "/";
  }
  return input;
}

export default async function SyncCartPage({ searchParams }: SyncCartPageProps) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  const params = (await searchParams) ?? {};
  const nextPath = normalizeNextPath(params.next);

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-10">
      <CartSyncClient nextPath={nextPath} />
    </main>
  );
}
