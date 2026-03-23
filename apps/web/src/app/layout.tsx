import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { FlashToastHost } from "@/components/feedback/flash-toast-host";
import { themeInitializationScript } from "@/features/theme/theme-script";
import { paletteInitializationScript } from "@/features/theme/palette-script";
import { popFlashToast } from "@/server/feedback/flash-toast";
import { getSiteBaseUrl } from "@/server/seo/metadata";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: getSiteBaseUrl(),
  title: {
    default: "Base Ecommerce",
    template: "%s | Base Ecommerce",
  },
  description: "Foundation scaffold for a reusable ecommerce platform",
  applicationName: "Base Ecommerce",
  openGraph: {
    type: "website",
    siteName: "Base Ecommerce",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const flashToast = await popFlashToast();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} />
        <script dangerouslySetInnerHTML={{ __html: paletteInitializationScript }} />
      </head>
      <body className={`${inter.variable} ${geistMono.variable} antialiased`}>
        <FlashToastHost initialToast={flashToast} />
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </body>
    </html>
  );
}
