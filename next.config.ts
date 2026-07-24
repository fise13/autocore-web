import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import createNextIntlPlugin from "next-intl/plugin";

/** Sparticuz ships brotli binaries under bin/ — must be traced into serverless bundles. */
const CHROMIUM_TRACE_INCLUDES = ["./node_modules/@sparticuz/chromium/bin/**/*"];

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** Keep monorepo / desktop / knowledge-graph artifacts out of every serverless function. */
const MONOREPO_TRACE_EXCLUDES = [
  "./autocore-mobile/**/*",
  "./graphify-out/**/*",
  "./src-tauri/**/*",
  "./insta-demo/**/*",
  "./docs/**/*",
  "./firebase/functions/**/*",
  "./public/downloads/**/*",
  "./public/marketing/**/*",
  "./public/spline/**/*",
  "./scripts/**/*",
  "./assets/**/*",
  "./AutoCore_Investor_Deck_*.pdf",
  "./tsconfig.tsbuildinfo",
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingExcludes: {
    "*": MONOREPO_TRACE_EXCLUDES,
  },
  outputFileTracingIncludes: {
    "/api/pdf/[documentType]/[orderId]": CHROMIUM_TRACE_INCLUDES,
    "/api/documents/generate": CHROMIUM_TRACE_INCLUDES,
    "/api/documents/process-queue": CHROMIUM_TRACE_INCLUDES,
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "date-fns",
      "motion",
      "@tanstack/react-query",
      "next-intl",
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
  async rewrites() {
    return [
      {
        source: "/yandex_:code.html",
        destination: "/api/seo/yandex-verify",
      },
    ];
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
