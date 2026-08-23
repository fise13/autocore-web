import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  legacyPathToLocalized,
  localeFromPathname,
  localizedPath,
  stripLocalePrefix,
  toMarketingInternalPath,
} from "@/i18n/marketing-paths";
import { marketingPathnames } from "@/i18n/routing";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, isAppLocale } from "@autocore/i18n/config";
import {
  cleanPathFromInternal,
  isMarketingContentPath,
} from "@/lib/seo/marketing-paths";
import { APP_SESSION_COOKIE, hasAppSessionCookie } from "@/lib/auth/session-cookie";
import {
  getAppUrl,
  getHostKind,
  getMarketingUrl,
  getUrlHost,
  isAppRoute,
  isLocalDevHost,
  isMarketingPublicPath,
  normalizeHost,
} from "@/lib/site-urls";

const APP_HOST_ROBOTS_TXT = [
  "User-agent: *",
  "Allow: /",
  "Allow: /login",
  "Allow: /legal/",
  "Allow: /welcome",
  "Allow: /business.html",
  "Disallow: /home",
  "Disallow: /warehouse",
  "Disallow: /work-orders",
  "Disallow: /settings",
  "Disallow: /api/",
  "",
].join("\n");

const APP_HOST_LEGAL_PATHS = new Set([
  "/legal/privacy",
  "/legal/refund",
  "/legal/terms",
]);

function redirectToMarketing(request: NextRequest, pathname: string): NextResponse {
  const target = new URL(pathname + request.nextUrl.search, getMarketingUrl());
  return NextResponse.redirect(target, 301);
}

function redirectAppRouteFromMarketing(request: NextRequest): NextResponse {
  const target = new URL(request.nextUrl.pathname + request.nextUrl.search, getAppUrl());
  return NextResponse.redirect(target, 301);
}

function redirectToCanonicalMarketingOrigin(request: NextRequest): NextResponse | null {
  const hostHeader = normalizeHost(request.headers.get("host") ?? "");
  const canonicalHost = getUrlHost(getMarketingUrl());
  if (!canonicalHost || !hostHeader) return null;

  const isLocal = hostHeader === "localhost" || hostHeader === "127.0.0.1";
  if (isLocal) return null;

  const proto =
    (request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", ""))
      .split(",")[0]
      ?.trim()
      .toLowerCase() ?? "https";

  const isMarketingHost =
    hostHeader === canonicalHost || hostHeader === `www.${canonicalHost}`;
  if (!isMarketingHost) return null;

  const needsHttps = proto !== "https";
  const needsWwwStrip = hostHeader.startsWith("www.");
  if (!needsHttps && !needsWwwStrip) return null;

  const target = new URL(request.url);
  target.protocol = "https:";
  target.hostname = canonicalHost;
  target.port = "";

  return NextResponse.redirect(target, 301);
}

const KNOWN_CLEAN = new Set<string>(Object.values(marketingPathnames));

function isLocalePrefixedPath(pathname: string): boolean {
  return localeFromPathname(pathname) !== null;
}

/** Old `/en/*` or `/ru/*` request → permanent redirect to the clean, unprefixed path. */
function redirectLocalizedToClean(request: NextRequest, pathname: string): NextResponse | null {
  if (!isLocalePrefixedPath(pathname)) return null;
  const clean = stripLocalePrefix(pathname);
  return NextResponse.redirect(new URL(clean + request.nextUrl.search, request.url), 301);
}

/** Serve a public clean path (`/`, `/product`, `/pricing`, …) from the internal `/marketing/en/…` tree. */
function rewriteCleanMarketing(request: NextRequest, pathname: string): NextResponse | null {
  if (pathname !== "/" && !KNOWN_CLEAN.has(pathname) && !pathname.startsWith("/legal/")) {
    if (![...KNOWN_CLEAN].some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      return null;
    }
  }
  const internal = toMarketingInternalPath(DEFAULT_LOCALE, pathname);
  return NextResponse.rewrite(new URL(internal + request.nextUrl.search, request.url));
}

/** Marketing host + unified localhost: clean public paths served from the internal tree. */
function handleMarketingRoutes(
  request: NextRequest,
  pathname: string,
  isMarketingHost: boolean,
): NextResponse {
  if (isMarketingHost) {
    const canonicalRedirect = redirectToCanonicalMarketingOrigin(request);
    if (canonicalRedirect) return canonicalRedirect;
  }

  // Old /en/* or /ru/* bookmark or backlink → 301 to the clean path.
  const localizedRedirect = redirectLocalizedToClean(request, pathname);
  if (localizedRedirect) return localizedRedirect;

  // Clean public path (/, /product, /pricing, …) → serve directly, no redirect.
  if (pathname === "/" || KNOWN_CLEAN.has(pathname) || pathname.startsWith("/legal/")) {
    const rewritten = rewriteCleanMarketing(request, pathname);
    if (rewritten) return rewritten;
  }

  const isLocalDev = isLocalDevHost(request.headers.get("host") ?? "");

  // Legacy /marketing and /marketing/* (internal-tree URL hit directly) → 301 to clean.
  if (pathname === "/marketing" || pathname.startsWith("/marketing/")) {
    // Internal tree shape (/marketing/en/...) — serve directly, only in local dev.
    const segments = pathname.split("/").filter(Boolean);
    if (isLocalDev && segments.length >= 2 && isAppLocale(segments[1])) {
      return NextResponse.next();
    }

    const localized = legacyPathToLocalized(pathname, DEFAULT_LOCALE);
    if (localized) {
      return NextResponse.redirect(new URL(localized + request.nextUrl.search, request.url), 301);
    }
  }

  if (isMarketingHost && isAppRoute(pathname) && !pathname.startsWith("/marketing")) {
    return redirectAppRouteFromMarketing(request);
  }

  return NextResponse.next();
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const kind = getHostKind(host);
  const { pathname } = request.nextUrl;
  const isLocalDev = isLocalDevHost(host);

  if (kind === "marketing") {
    return handleMarketingRoutes(request, pathname, true);
  }

  // Localhost: locale marketing URLs + clean legacy marketing paths
  if (kind === "local") {
    const localizedRedirect = redirectLocalizedToClean(request, pathname);
    if (localizedRedirect) return localizedRedirect;

    if (isMarketingContentPath(pathname) && !isAppRoute(pathname)) {
      return handleMarketingRoutes(request, pathname, false);
    }

    if (isLocalDev && pathname.startsWith("/marketing")) {
      const segments = pathname.split("/").filter(Boolean);
      if (segments.length >= 2 && isAppLocale(segments[1])) {
        return NextResponse.next();
      }
      const localized = legacyPathToLocalized(pathname, DEFAULT_LOCALE);
      if (localized) {
        return NextResponse.redirect(new URL(localized + request.nextUrl.search, request.url), 301);
      }
      return NextResponse.next();
    }
  }

  if (kind === "app") {
    if (pathname === "/robots.txt") {
      return new NextResponse(APP_HOST_ROBOTS_TXT, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // App root is always the public company page (Paddle / crawlers / guests).
    // Signed-in users are sent to /home for the workspace overview.
    if (pathname === "/") {
      if (hasAppSessionCookie(request.cookies.get(APP_SESSION_COOKIE)?.value)) {
        return NextResponse.redirect(new URL("/home" + request.nextUrl.search, request.url));
      }
      return NextResponse.rewrite(new URL("/app-public", request.url));
    }

    if (pathname === "/sitemap.xml") {
      return NextResponse.redirect(`${getMarketingUrl().replace(/\/$/, "")}/sitemap.xml`, 301);
    }

    if (pathname.startsWith("/marketing") || isLocalePrefixedPath(pathname)) {
      // Any /en/* or /ru/* hitting the app host still lands on the clean marketing path.
      const clean = isLocalePrefixedPath(pathname) ? stripLocalePrefix(pathname) : cleanPathFromInternal(pathname);
      const localized = legacyPathToLocalized(clean ?? pathname, DEFAULT_LOCALE);
      return redirectToMarketing(request, localized ?? clean ?? localizedPath(DEFAULT_LOCALE, "/"));
    }

    if (APP_HOST_LEGAL_PATHS.has(pathname)) {
      return handleMarketingRoutes(request, pathname, false);
    }

    if (isMarketingPublicPath(pathname) && pathname !== "/") {
      const localized = legacyPathToLocalized(pathname, DEFAULT_LOCALE);
      return redirectToMarketing(request, localized ?? pathname);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|business\\.html|\\.well-known|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|html)$).*)",
  ],
};

// Silence unused in edge build when tree-shaken oddly
void SUPPORTED_LOCALES;
