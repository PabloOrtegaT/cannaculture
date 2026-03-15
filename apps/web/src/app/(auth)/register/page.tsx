import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@base-ecommerce/ui";

export const metadata: Metadata = {
  title: "Register | Base Ecommerce",
  description: "Create an email/password account with verification.",
};

type RegisterPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = (await searchParams) ?? {};

  return (
    <main className="mx-auto w-full max-w-lg space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
      {params.error && <p className="text-sm text-red-700">Could not create account: {params.error}</p>}

      <form action="/api/auth/register" method="post" className="space-y-3 rounded-lg border bg-card p-6 text-card-foreground">
        <div>
          <label htmlFor="register-name" className="text-sm text-muted-foreground">
            Full name
          </label>
          <input
            id="register-name"
            name="name"
            type="text"
            required
            minLength={2}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="register-email" className="text-sm text-muted-foreground">
            Email
          </label>
          <input
            id="register-email"
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="register-password" className="text-sm text-muted-foreground">
            Password
          </label>
          <input
            id="register-password"
            name="password"
            type="password"
            required
            minLength={8}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
        <Button type="submit">Create account</Button>
      </form>

      <Link href="/login" className="text-sm text-muted-foreground hover:underline">
        Back to login
      </Link>
    </main>
  );
}

