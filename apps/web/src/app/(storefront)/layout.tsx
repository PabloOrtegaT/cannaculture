import Link from "next/link";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { isAdminRole } from "@/server/admin/role-guard";
import { getSessionUser } from "@/server/auth/session";
import { resolveAdminEntryHref } from "@/server/config/host-policy";
import { getHostRuntimeConfig } from "@/server/config/runtime-env";

export const dynamic = "force-dynamic";

export default async function StorefrontLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();
  const canOpenAdmin = Boolean(user && isAdminRole(user.role));
  const hostConfig = getHostRuntimeConfig();
  const adminHref = resolveAdminEntryHref(hostConfig.appBaseUrl, hostConfig.adminBaseUrl, "/admin");
  const adminHrefIsAbsolute = adminHref.startsWith("http://") || adminHref.startsWith("https://");

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
              {canOpenAdmin && (
                adminHrefIsAbsolute ? (
                  <a href={adminHref} className="hover:underline">
                    Admin
                  </a>
                ) : (
                  <Link href={adminHref} className="hover:underline" prefetch={false}>
                    Admin
                  </Link>
                )
              )}
            </nav>
            <ThemeToggle />
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
