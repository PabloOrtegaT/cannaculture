import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input, Label } from "@cannaculture/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createPageMetadata } from "@/server/seo/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Reset Password",
  description: "Choose a new password using a valid reset token.",
  pathname: "/reset-password",
  noIndex: true,
});

type ResetPasswordPageProps = {
  searchParams?: Promise<{ token?: string; error?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = (await searchParams) ?? {};
  const token = params.token ?? "";

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Set new password</h1>
          <p className="mt-2 text-sm text-muted-foreground">Choose a strong password for your account</p>
        </div>

        {(!token || params.error) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {!token ? "Missing reset token." : "Reset token is invalid or expired."}
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">New password</CardTitle>
            <CardDescription>Must be at least 12 characters with uppercase, lowercase, and number</CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/api/auth/reset-password" method="post" className="space-y-4">
              <input type="hidden" name="token" value={token} />
              <div className="space-y-1.5">
                <Label htmlFor="reset-password">New password</Label>
                <Input
                  id="reset-password"
                  name="password"
                  type="password"
                  required
                  minLength={12}
                  placeholder="Min. 12 characters with uppercase, lowercase, and number"
                  autoComplete="new-password"
                  disabled={!token}
                />
              </div>
              <Button type="submit" className="w-full" disabled={!token}>
                Save new password
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
