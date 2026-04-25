import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Sprout } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LoginForm } from "@/components/auth/login-form";
import { getOAuthProviderFlags } from "@/server/config/runtime-env";
import { createPageMetadata } from "@/server/seo/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Login",
  description: "Sign in with email/password or social providers.",
  pathname: "/login",
  noIndex: true,
});

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string;
    registered?: string;
    verified?: string;
    reset?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};
  const providerFlags = getOAuthProviderFlags();
  const nextPath = params.next && params.next.startsWith("/") ? params.next : "/auth/sync-cart?next=%2F";
  const afterLoginPath = `/auth/after-login?next=${encodeURIComponent(nextPath)}`;
  const callbackUrl = afterLoginPath;

  const successMessage = params.registered
    ? "Account created. Please verify your email before signing in."
    : params.verified
      ? "Email verified. You can now sign in."
      : params.reset
        ? "Password reset completed. Sign in with your new password."
        : null;

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30">
            <Sprout className="h-6 w-6 text-emerald-600" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back, grower</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to manage your orders and grow setup
          </p>
        </div>

        {successMessage && (
          <Alert variant="success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        <Card className="border-emerald-200/50 dark:border-emerald-900/30">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Sign in</CardTitle>
            <CardDescription>Enter your email and password</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm
              callbackUrl={callbackUrl}
              googleEnabled={providerFlags.googleEnabled}
              facebookEnabled={providerFlags.facebookEnabled}
            />
          </CardContent>
          <CardFooter className="flex flex-col gap-3 border-t pt-4">
            <Separator className="hidden" />
            <div className="flex w-full flex-wrap justify-between gap-2 text-sm">
              <Link href="/register" className="text-muted-foreground hover:text-foreground transition-colors">
                Create account
              </Link>
              <Link href="/forgot-password" className="text-muted-foreground hover:text-foreground transition-colors">
                Forgot password?
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
