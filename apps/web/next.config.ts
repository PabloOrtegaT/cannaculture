import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const commonSecurityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: csp,
  },
];

const adminSecurityHeaders = [
  ...commonSecurityHeaders,
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@cannaculture/domain", "@cannaculture/ui", "@cannaculture/validation"],
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "storefront.lvh.me",
    "admin.lvh.me",
  ],
  async headers() {
    return [
      {
        source: "/admin/:path*",
        headers: adminSecurityHeaders,
      },
      {
        source: "/:path*",
        headers: commonSecurityHeaders,
      },
    ];
  },
};

initOpenNextCloudflareForDev();

export default nextConfig;
