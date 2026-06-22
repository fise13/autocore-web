import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

/** Sparticuz ships brotli binaries under bin/ — must be traced into serverless bundles. */
const CHROMIUM_TRACE_INCLUDES = ["./node_modules/@sparticuz/chromium/bin/**/*"];

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/api/pdf/*": CHROMIUM_TRACE_INCLUDES,
    "/api/documents/generate": CHROMIUM_TRACE_INCLUDES,
    "/api/documents/process-queue": CHROMIUM_TRACE_INCLUDES,
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "date-fns",
      "framer-motion",
      "@tanstack/react-query",
    ],
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.myautocore.com" }],
        destination: "https://myautocore.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.app.myautocore.com" }],
        destination: "https://app.myautocore.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
