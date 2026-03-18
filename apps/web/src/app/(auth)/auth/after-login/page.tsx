import { redirect } from "next/navigation";
import { AfterLoginClient } from "@/components/auth/after-login-client";
import { getSessionUser } from "@/server/auth/session";

type AfterLoginPageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

function normalizeNextPath(input?: string) {
  if (!input || !input.startsWith("/")) {
    return "/auth/sync-cart?next=%2F";
  }
  return input;
}

export default async function AfterLoginPage({ searchParams }: AfterLoginPageProps) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const nextPath = normalizeNextPath(resolvedSearchParams.next);

  return (
    <main className="mx-auto w-full max-w-lg px-6 py-10">
      <AfterLoginClient nextPath={nextPath} />
    </main>
  );
}
