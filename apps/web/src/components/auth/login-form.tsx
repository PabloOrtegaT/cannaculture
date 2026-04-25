"use client";

import { Button, Input, Label } from "@cannaculture/ui";
import { FormEvent, useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

type LoginFormProps = {
  callbackUrl: string;
  googleEnabled: boolean;
  facebookEnabled: boolean;
};

export function LoginForm({ callbackUrl, googleEnabled, facebookEnabled }: LoginFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onCredentialsSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    setErrorMessage(null);
    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (!result) {
        setErrorMessage("Authentication is unavailable. Please try again.");
        return;
      }

      if (result.error) {
        setErrorMessage("Invalid credentials or account not verified.");
        return;
      }

      window.location.replace(callbackUrl);
    });
  };

  const onProviderLogin = (provider: "google" | "facebook") => {
    startTransition(async () => {
      await signIn(provider, { callbackUrl });
    });
  };

  const hasOAuth = googleEnabled || facebookEnabled;

  return (
    <div className="space-y-4">
      <form onSubmit={onCredentialsSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            name="email"
            type="email"
            required
            placeholder="tu@email.com"
            autoComplete="email"
            disabled={isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="login-password">Password</Label>
          <Input
            id="login-password"
            name="password"
            type="password"
            required
            placeholder="Your password"
            autoComplete="current-password"
            disabled={isPending}
          />
        </div>

        {errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      {hasOAuth && (
        <>
          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
              or continue with
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {googleEnabled && (
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => onProviderLogin("google")}
              >
                Google
              </Button>
            )}
            {facebookEnabled && (
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => onProviderLogin("facebook")}
                className={!googleEnabled ? "col-span-2" : ""}
              >
                Facebook
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
