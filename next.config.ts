import type { NextConfig } from "next";

/** Sparticuz ships brotli binaries under bin/ — must be traced into serverless bundles. */
const CHROMIUM_TRACE_INCLUDES = ["./node_modules/@sparticuz/chromium/bin/**/*"];

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/api/pdf/*": CHROMIUM_TRACE_INCLUDES,
    "/api/documents/generate": CHROMIUM_TRACE_INCLUDES,
    "/api/documents/process-queue": CHROMIUM_TRACE_INCLUDES,
  },
};

export default nextConfig;
