import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@base-ecommerce/ui";

export const metadata: Metadata = {
  title: "Forgot Password | Base Ecommerce",
  description: "Request a password reset email.",
};

type ForgotPasswordPageProps = {
  searchParams?: Promise<{ sent?: string; error?: string }>;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = (await searchParams) ?? {};

  return (
    <main className="mx-auto w-full max-w-lg space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Forgot password</h1>
      {params.sent && <p className="text-sm text-emerald-700">If this email exists, a reset link has been sent.</p>}
      {params.error && <p className="text-sm text-red-700">Could not process request: {params.error}</p>}

      <form action="/api/auth/forgot-password" method="post" className="space-y-3 rounded-lg border bg-card p-6 text-card-foreground">
        <div>
          <label htmlFor="forgot-email" className="text-sm text-muted-foreground">
            Email
          </label>
          <input
            id="forgot-email"
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
        <Button type="submit">Send reset email</Button>
      </form>

      <Link href="/login" className="text-sm text-muted-foreground hover:underline">
        Back to login
      </Link>
    </main>
  );
}

