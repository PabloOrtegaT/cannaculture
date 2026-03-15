import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/session";

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?next=/account");
  }

  return (
    <main className="mx-auto w-full max-w-xl space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
      <section className="rounded-lg border bg-card p-6 text-card-foreground">
        <p className="text-sm text-muted-foreground">Signed in as</p>
        <p className="font-medium">{user.email}</p>
        <p className="mt-2 text-sm text-muted-foreground">Role: {user.role}</p>
      </section>
      <Link href="/logout" className="text-sm text-muted-foreground hover:underline">
        Sign out
      </Link>
    </main>
  );
}

