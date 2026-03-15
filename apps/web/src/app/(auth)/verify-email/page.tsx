import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Verify Email | Base Ecommerce",
  description: "Account verification status.",
};

type VerifyPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyPageProps) {
  const params = (await searchParams) ?? {};
  const hasError = Boolean(params.error);

  return (
    <main className="mx-auto w-full max-w-lg space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Email verification</h1>
      {hasError ? (
        <p className="text-sm text-red-700">Verification link is invalid or expired. Request a new account registration.</p>
      ) : (
        <p className="text-sm text-muted-foreground">Use the verification link sent to your email inbox.</p>
      )}
      <Link href="/login" className="text-sm text-muted-foreground hover:underline">
        Back to login
      </Link>
    </main>
  );
}

