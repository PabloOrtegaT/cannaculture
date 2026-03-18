"use client";

import { FormEvent, useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@base-ecommerce/ui";

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

  return (
    <div className="space-y-4">
      <form onSubmit={onCredentialsSubmit} className="space-y-3 rounded-lg border bg-card p-6 text-card-foreground">
        <div>
          <label htmlFor="login-email" className="text-sm text-muted-foreground">
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="login-password" className="text-sm text-muted-foreground">
            Password
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            required
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
        {errorMessage && <p className="text-sm text-red-700">{errorMessage}</p>}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <section className="rounded-lg border bg-card p-6 text-card-foreground">
        <p className="text-sm font-medium">Other sign-in methods</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={!googleEnabled || isPending} onClick={() => onProviderLogin("google")}>
            Continue with Google
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!facebookEnabled || isPending}
            onClick={() => onProviderLogin("facebook")}
          >
            Continue with Facebook
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Providers are enabled only when credentials exist in environment variables.
        </p>
      </section>
    </div>
  );
}
