import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@base-ecommerce/domain", "@base-ecommerce/ui", "@base-ecommerce/validation"],
};

export default nextConfig;
