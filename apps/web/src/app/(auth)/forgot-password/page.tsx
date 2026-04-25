import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input, Label } from "@cannaculture/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createPageMetadata } from "@/server/seo/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Forgot Password",
  description: "Request a password reset email.",
  pathname: "/forgot-password",
  noIndex: true,
});

type ForgotPasswordPageProps = {
  searchParams?: Promise<{ sent?: string; error?: string }>;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = (await searchParams) ?? {};

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Forgot password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your email and we&apos;ll send a reset link
          </p>
        </div>

        {params.sent && (
          <Alert variant="success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>If this email exists, a reset link has been sent.</AlertDescription>
          </Alert>
        )}
        {params.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Could not process request: {params.error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Reset your password</CardTitle>
            <CardDescription>We&apos;ll email you a secure reset link</CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/api/auth/forgot-password" method="post" className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="forgot-email">Email address</Label>
                <Input
                  id="forgot-email"
                  name="email"
                  type="email"
                  required
                  placeholder="tu@email.com"
                  autoComplete="email"
                />
              </div>
              <Button type="submit" className="w-full">
                Send reset email
              </Button>
            </form>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Back to sign in
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
