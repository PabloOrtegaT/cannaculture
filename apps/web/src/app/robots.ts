import type { MetadataRoute } from "next";
import { getSiteBaseUrl } from "@/server/seo/metadata";

export const revalidate = 3600;

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteBaseUrl();
  const sitemapUrl = new URL("/sitemap.xml", baseUrl).toString();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/catalog"],
        disallow: [
          "/admin",
          "/account",
          "/cart",
          "/checkout",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/verify-email",
          "/api",
        ],
      },
    ],
    sitemap: [sitemapUrl],
    host: baseUrl.origin,
  };
}

