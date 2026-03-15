import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { buildAbsoluteUrl, isAdminPath, resolveHostPolicy } from "@/server/config/host-policy";
import { getHostRuntimeConfig, getOAuthProviderFlags } from "@/server/config/runtime-env";

export const metadata: Metadata = {
  title: "Login | Base Ecommerce",
  description: "Sign in with email/password or social providers.",
};

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
  const nextPath = params.next && params.next.startsWith("/") ? params.next : "/auth/sync-cart";
  const hostConfig = getHostRuntimeConfig();
  const hostPolicy = resolveHostPolicy({
    appBaseUrl: hostConfig.appBaseUrl,
    adminBaseUrl: hostConfig.adminBaseUrl,
  });
  const afterLoginPath = `/auth/after-login?next=${encodeURIComponent(nextPath)}`;
  const callbackUrl = isAdminPath(nextPath)
    ? buildAbsoluteUrl(hostPolicy.adminBaseUrl, afterLoginPath)
    : buildAbsoluteUrl(hostPolicy.appBaseUrl, afterLoginPath);

  return (
    <main className="mx-auto w-full max-w-lg space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Login</h1>
      {params.registered && <p className="text-sm text-emerald-700">Account created. Verify your email before signing in.</p>}
      {params.verified && <p className="text-sm text-emerald-700">Email verified. You can sign in now.</p>}
      {params.reset && <p className="text-sm text-emerald-700">Password reset completed. Sign in with your new password.</p>}

      <LoginForm
        callbackUrl={callbackUrl}
        googleEnabled={providerFlags.googleEnabled}
        facebookEnabled={providerFlags.facebookEnabled}
      />

      <div className="flex flex-wrap gap-4 text-sm">
        <Link href="/register" className="text-muted-foreground hover:underline">
          Create account
        </Link>
        <Link href="/forgot-password" className="text-muted-foreground hover:underline">
          Forgot password
        </Link>
      </div>
    </main>
  );
}
