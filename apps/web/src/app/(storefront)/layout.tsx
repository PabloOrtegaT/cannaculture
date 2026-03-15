import Link from "next/link";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { resolveHostPolicy } from "@/server/config/host-policy";
import { getHostRuntimeConfig } from "@/server/config/runtime-env";
import { getSessionUser } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function StorefrontLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();
  const hostConfig = getHostRuntimeConfig();
  const hostPolicy = resolveHostPolicy({
    appBaseUrl: hostConfig.appBaseUrl,
    adminBaseUrl: hostConfig.adminBaseUrl,
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-6xl px-6 py-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-card-foreground">
          <Link href="/" className="font-semibold">
            Base Ecommerce
          </Link>
          <div className="flex items-center gap-3">
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link href="/catalog" className="hover:underline">
                Catalog
              </Link>
              <Link href="/cart" className="hover:underline">
                Cart
              </Link>
              {user ? (
                <>
                  <Link href="/account" className="hover:underline">
                    Account
                  </Link>
                  <Link href="/logout" className="hover:underline">
                    Logout
                  </Link>
                </>
              ) : (
                <Link href="/login" className="hover:underline">
                  Login
                </Link>
              )}
              <Link href={`${hostPolicy.adminBaseUrl}/admin`} className="hover:underline">
                Admin
              </Link>
            </nav>
            <ThemeToggle />
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
