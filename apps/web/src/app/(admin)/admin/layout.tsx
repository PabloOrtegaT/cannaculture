import Link from "next/link";
import { forbidden, redirect } from "next/navigation";
import {
  LayoutDashboard,
  Tag,
  Package,
  FileText,
  Ticket,
  Upload,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { canAccessAdminRoute, type AdminRouteKey, assertAdminHostAccess, isAdminRole } from "@/server/admin/role-guard";
import { getSessionUser } from "@/server/auth/session";
import { getHostRuntimeConfig } from "@/server/config/runtime-env";
import { buildAbsoluteUrl, resolveHostPolicy } from "@/server/config/host-policy";

export const dynamic = "force-dynamic";

const adminNavigation: {
  href: string;
  label: string;
  route: AdminRouteKey;
  icon: React.ReactNode;
  description: string;
}[] = [
  { href: "/admin", label: "Dashboard", route: "dashboard", icon: <LayoutDashboard className="h-4 w-4" />, description: "Overview and analytics" },
  { href: "/admin/categories", label: "Categories", route: "categories", icon: <Tag className="h-4 w-4" />, description: "Manage categories" },
  { href: "/admin/products", label: "Products", route: "products", icon: <Package className="h-4 w-4" />, description: "Products and variants" },
  { href: "/admin/content", label: "Content", route: "content", icon: <FileText className="h-4 w-4" />, description: "Home content" },
  { href: "/admin/coupons", label: "Coupons", route: "coupons", icon: <Ticket className="h-4 w-4" />, description: "Discount codes" },
  { href: "/admin/import", label: "Import", route: "import", icon: <Upload className="h-4 w-4" />, description: "Bulk CSV import" },
];

const roleColors: Record<string, "default" | "secondary" | "outline"> = {
  owner: "default",
  manager: "secondary",
  catalog: "outline",
};

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await assertAdminHostAccess();
  const user = await getSessionUser();
  const hostConfig = getHostRuntimeConfig();
  const policy = resolveHostPolicy(hostConfig);
  const storefrontHref =
    !policy.appHost || policy.appHost === policy.adminHost
      ? "/"
      : buildAbsoluteUrl(policy.appBaseUrl, "/");
  if (!user) {
    redirect("/login?next=/admin");
  }
  if (!isAdminRole(user.role)) {
    forbidden();
  }

  const role = user.role;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top bar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <Link href="/admin" className="font-semibold">
              Admin
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Badge variant={roleColors[role] ?? "secondary"}>{role}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <a href={storefrontHref} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Storefront
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 border-r bg-background md:flex md:flex-col">
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {adminNavigation.map((item) => {
              const accessible = canAccessAdminRoute(role, item.route);
              if (!accessible) {
                return (
                  <div
                    key={item.href}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/40 cursor-not-allowed"
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <Separator />
          <div className="p-3">
            <Link
              href="/logout"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              Sign out
            </Link>
          </div>
        </aside>

        {/* Mobile nav */}
        <div className="flex w-full overflow-x-auto border-b bg-background md:hidden">
          <nav className="flex items-center gap-1 px-3 py-2">
            {adminNavigation.map((item) => {
              const accessible = canAccessAdminRoute(role, item.route);
              if (!accessible) {
                return (
                  <span key={item.href} className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground/40 cursor-not-allowed whitespace-nowrap">
                    {item.icon}
                    {item.label}
                  </span>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors whitespace-nowrap"
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
