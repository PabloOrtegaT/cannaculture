import Link from "next/link";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function StorefrontLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
              <Link href="/admin" className="hover:underline">
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
