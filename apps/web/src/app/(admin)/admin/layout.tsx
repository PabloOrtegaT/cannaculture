import Link from "next/link";
import { forbidden, redirect } from "next/navigation";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { canAccessAdminRoute, type AdminRouteKey, assertAdminHostAccess, isAdminRole } from "@/server/admin/role-guard";
import { getSessionUser } from "@/server/auth/session";

export const dynamic = "force-dynamic";

const adminNavigation: { href: string; label: string; route: AdminRouteKey }[] = [
  { href: "/admin", label: "Dashboard", route: "dashboard" },
  { href: "/admin/products", label: "Products", route: "products" },
  { href: "/admin/content", label: "Content", route: "content" },
  { href: "/admin/coupons", label: "Coupons", route: "coupons" },
  { href: "/admin/import", label: "Import", route: "import" },
];

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await assertAdminHostAccess();
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?next=/admin");
  }
  if (!isAdminRole(user.role)) {
    forbidden();
  }

  const role = user.role;

  return (
    <div className="min-h-screen bg-muted">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-10">
        <header className="space-y-3 rounded-lg border bg-card px-4 py-3 text-card-foreground">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/admin" className="font-semibold">
              Admin
            </Link>
            <div className="flex items-center gap-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Role: {role}</p>
              <ThemeToggle />
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-3 text-sm">
            {adminNavigation.map((item) =>
              canAccessAdminRoute(role, item.route) ? (
                <Link key={item.href} href={item.href} className="text-muted-foreground hover:text-foreground hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span key={item.href} className="cursor-not-allowed text-muted-foreground/50">
                  {item.label}
                </span>
              ),
            )}
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
