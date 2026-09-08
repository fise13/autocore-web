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

/**
 * Origins the product actually talks to. Kept as one list so the CSP below and
 * any future allowlist stay in step with reality rather than drifting apart.
 */
const CONNECT_ORIGINS = [
  "https://*.googleapis.com",
  "https://*.firebaseio.com",
  "https://*.cloudfunctions.net",
  "https://firebasestorage.googleapis.com",
  "https://identitytoolkit.googleapis.com",
  "https://securetoken.googleapis.com",
  "https://appleid.apple.com",
  "https://openrouter.ai",
  "https://open.er-api.com",
  "https://exp.host",
  "https://avatar.vercel.sh",
  "https://mc.yandex.ru",
  "https://*.google-analytics.com",
  "https://*.analytics.google.com",
  "https://*.googletagmanager.com",
  "https://*.g.doubleclick.net",
  "https://www.google.com",
  "https://www.googleadservices.com",
  "https://googleads.g.doubleclick.net",
  "https://pagead2.googlesyndication.com",
  "wss://*.firebaseio.com",
].join(" ");

/**
 * Content-Security-Policy, deliberately shipped in Report-Only mode.
 *
 * The app had no CSP at all, and a first enforced policy on a surface this size
 * reliably breaks something in production. Report-Only puts violations in the
 * browser console and any configured report sink without blocking a single
 * request, so the policy can be tightened against real traffic. Promote this to
 * `Content-Security-Policy` once the reports come back clean.
 *
 * `unsafe-inline`/`unsafe-eval` on scripts are required by Next's inline
 * bootstrap and the Spline/GSAP marketing surfaces; tightening those needs a
 * nonce pipeline and is a separate piece of work.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://appleid.apple.com",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://appleid.cdn-apple.com https://mc.yandex.ru https://www.googletagmanager.com https://www.google-analytics.com https://ssl.google-analytics.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://www.google.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' blob: https:",
  "worker-src 'self' blob:",
  "frame-src 'self' https://appleid.apple.com https://www.googletagmanager.com https://td.doubleclick.net https://www.google.com",
  `connect-src 'self' ${CONNECT_ORIGINS}`,
  "upgrade-insecure-requests",
].join("; ");

/**
 * Headers applied to every response. None of these existed before, which left
 * the app open to clickjacking and MIME sniffing and leaked full referrer URLs
 * — including workspace paths carrying company ids — to third-party sites.
 */
const SECURITY_HEADERS = [
  // Browsers only honour HSTS over HTTPS, so this is inert in local dev.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    // Camera stays available: the web app scans codes. Everything unused is denied.
    value: "camera=(self), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Content-Security-Policy-Report-Only", value: CONTENT_SECURITY_POLICY },
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
      "@ai-sdk/react",
    ],
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  async redirects() {
    return [
      {
        source: "/download/mobile",
        destination: "/download",
        permanent: false,
      },
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
