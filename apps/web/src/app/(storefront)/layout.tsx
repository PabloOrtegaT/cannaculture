import Link from "next/link";
import { StorefrontHeader } from "@/components/storefront/storefront-header";

const footerShopLinks = [
  { href: "/catalog/plant-seeds", label: "Seeds" },
  { href: "/catalog/grow-lights", label: "Grow lights" },
  { href: "/catalog/substrates", label: "Substrates" },
  { href: "/catalog", label: "Full catalog" },
];

const footerSupportLinks = [
  { href: "/account", label: "Your account" },
  { href: "/cart", label: "Cart" },
  { href: "/login", label: "Sign in" },
  { href: "/register", label: "Create account" },
];

export default async function StorefrontLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <StorefrontHeader />

      {/* Page content */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold">Cannaculture</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  A focused storefront for indoor growers shopping seeds, lighting, substrates,
                  and practical plant-care gear.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Built for small-space growing &middot; Helpful buying guides &middot; Secure checkout
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Shop
              </p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {footerShopLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="transition-colors hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Account
              </p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {footerSupportLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="transition-colors hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
