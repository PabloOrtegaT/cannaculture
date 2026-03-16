import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-6 py-10">
      <section className="w-full space-y-4 rounded-lg border bg-card p-6 text-card-foreground">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">403 Forbidden</p>
        <h1 className="text-2xl font-semibold tracking-tight">You do not have access to this area</h1>
        <p className="text-sm text-muted-foreground">
          This section is restricted to administrative roles. If you think this is incorrect, contact an account owner.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/" className="rounded-md border px-3 py-2 hover:bg-muted">
            Go to storefront
          </Link>
          <Link href="/account" className="rounded-md border px-3 py-2 hover:bg-muted">
            My account
          </Link>
          <Link href="/login" className="rounded-md border px-3 py-2 hover:bg-muted">
            Login
          </Link>
        </div>
      </section>
    </main>
  );
}
