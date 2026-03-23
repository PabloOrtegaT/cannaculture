import { StorefrontHeader } from "@/components/storefront/storefront-header";

export default async function StorefrontLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-background">
      <StorefrontHeader />

      {/* Page content */}
      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        {children}
      </main>
    </div>
  );
}
