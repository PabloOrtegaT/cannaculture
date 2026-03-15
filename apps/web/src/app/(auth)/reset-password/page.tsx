import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@base-ecommerce/ui";

export const metadata: Metadata = {
  title: "Reset Password | Base Ecommerce",
  description: "Choose a new password using a valid reset token.",
};

type ResetPasswordPageProps = {
  searchParams?: Promise<{ token?: string; error?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = (await searchParams) ?? {};
  const token = params.token ?? "";

  return (
    <main className="mx-auto w-full max-w-lg space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
      {!token && <p className="text-sm text-red-700">Missing reset token.</p>}
      {params.error && <p className="text-sm text-red-700">Reset token is invalid or expired.</p>}

      <form action="/api/auth/reset-password" method="post" className="space-y-3 rounded-lg border bg-card p-6 text-card-foreground">
        <input type="hidden" name="token" value={token} />
        <div>
          <label htmlFor="reset-password" className="text-sm text-muted-foreground">
            New password
          </label>
          <input
            id="reset-password"
            name="password"
            type="password"
            required
            minLength={8}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
        <Button type="submit" disabled={!token}>
          Save new password
        </Button>
      </form>

      <Link href="/login" className="text-sm text-muted-foreground hover:underline">
        Back to login
      </Link>
    </main>
  );
}

