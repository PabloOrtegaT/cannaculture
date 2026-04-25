import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input, Label } from "@cannaculture/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, Sprout, Leaf, Truck, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createPageMetadata } from "@/server/seo/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Register",
  description: "Create an email/password account with verification.",
  pathname: "/register",
  noIndex: true,
});

type RegisterPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = (await searchParams) ?? {};

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30">
            <Sprout className="h-6 w-6 text-emerald-600" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Start your growing journey</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Join growers who trust Cannaculture for premium indoor supplies
          </p>
        </div>

        {params.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Could not create account: {params.error}</AlertDescription>
          </Alert>
        )}

        <Card className="border-emerald-200/50 dark:border-emerald-900/30">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Account details</CardTitle>
            <CardDescription>All fields are required</CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/api/auth/register" method="post" className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="register-name">Full name</Label>
                <Input
                  id="register-name"
                  name="name"
                  type="text"
                  required
                  minLength={2}
                  placeholder="Jane Smith"
                  autoComplete="name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="register-email">Email</Label>
                <Input
                  id="register-email"
                  name="email"
                  type="email"
                  required
                  placeholder="tu@email.com"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="register-password">Password</Label>
                <Input
                  id="register-password"
                  name="password"
                  type="password"
                  required
                  minLength={12}
                  placeholder="Min. 12 characters with uppercase, lowercase, and number"
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" className="w-full">
                Create account
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 border-t pt-4">
            {/* Value props */}
            <div className="grid grid-cols-3 gap-2 w-full">
              <div className="flex flex-col items-center gap-1 text-center">
                <Leaf className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                <span className="text-[10px] text-muted-foreground leading-tight">
                  Curated supplies
                </span>
              </div>
              <div className="flex flex-col items-center gap-1 text-center">
                <Truck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                <span className="text-[10px] text-muted-foreground leading-tight">
                  Fast shipping
                </span>
              </div>
              <div className="flex flex-col items-center gap-1 text-center">
                <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                <span className="text-[10px] text-muted-foreground leading-tight">
                  Indoor-grow picks
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-foreground font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
