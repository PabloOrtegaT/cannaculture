import type { Metadata } from "next";
import { FlashToastHost } from "@/components/feedback/flash-toast-host";
import { themeInitializationScript } from "@/features/theme/theme-script";
import { paletteInitializationScript } from "@/features/theme/palette-script";
import { popFlashToast } from "@/server/feedback/flash-toast";
import { getSiteBaseUrl, SEO_BRAND_NAME, SEO_BRAND_SUMMARY_ES } from "@/server/seo/metadata";
import "./fonts.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: getSiteBaseUrl(),
  title: {
    default: SEO_BRAND_NAME,
    template: `%s | ${SEO_BRAND_NAME}`,
  },
  description: SEO_BRAND_SUMMARY_ES,
  applicationName: SEO_BRAND_NAME,
  openGraph: {
    type: "website",
    siteName: SEO_BRAND_NAME,
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
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/fonts/inter-latin-400-normal.woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/fonts/inter-latin-500-normal.woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/fonts/inter-latin-600-normal.woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/fonts/inter-latin-700-normal.woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/fonts/geist-mono-latin-400-normal.woff2"
          crossOrigin="anonymous"
        />
        <script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} />
        <script dangerouslySetInnerHTML={{ __html: paletteInitializationScript }} />
      </head>
      <body className="antialiased">
        <FlashToastHost initialToast={flashToast} />
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </body>
    </html>
  );
}
