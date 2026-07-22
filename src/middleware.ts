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
  resolveMarketingPathFromClean,
} from "@/lib/seo/marketing-paths";
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

function rewriteLocalizedMarketing(request: NextRequest, pathname: string): NextResponse | null {
  const locale = localeFromPathname(pathname);
  if (!locale) return null;

  const rest = stripLocalePrefix(pathname);
  if (rest !== "/" && !KNOWN_CLEAN.has(rest) && !rest.startsWith("/legal/")) {
    // Allow known marketing tree only
    if (![...KNOWN_CLEAN].some((p) => rest === p || rest.startsWith(`${p}/`))) {
      return null;
    }
  }

  const internal = toMarketingInternalPath(locale, rest);
  return NextResponse.rewrite(new URL(internal + request.nextUrl.search, request.url));
}

/** Marketing host + unified localhost: locale URLs + legacy clean /marketing/* → locale. */
function handleMarketingRoutes(
  request: NextRequest,
  pathname: string,
  isMarketingHost: boolean,
): NextResponse {
  if (isMarketingHost) {
    const canonicalRedirect = redirectToCanonicalMarketingOrigin(request);
    if (canonicalRedirect) return canonicalRedirect;
  }

  // Prefer locale-prefixed public URLs → rewrite into /marketing/[locale]/…
  if (isLocalePrefixedPath(pathname)) {
    const rewritten = rewriteLocalizedMarketing(request, pathname);
    if (rewritten) return rewritten;
  }

  // Marketing host root → default locale
  if (pathname === "/" && isMarketingHost) {
    return NextResponse.redirect(
      new URL(localizedPath(DEFAULT_LOCALE, "/") + request.nextUrl.search, request.url),
      302,
    );
  }

  // Legacy clean paths without locale (/product, /pricing, …) → /en/…
  const internalFromClean = resolveMarketingPathFromClean(pathname);
  if (internalFromClean || KNOWN_CLEAN.has(pathname)) {
    const localized = legacyPathToLocalized(pathname, DEFAULT_LOCALE);
    if (localized) {
      return NextResponse.redirect(new URL(localized + request.nextUrl.search, request.url), 301);
    }
  }

  const isLocalDev = isLocalDevHost(request.headers.get("host") ?? "");

  // Legacy /marketing and /marketing/* → /en/…
  if (pathname === "/marketing" || pathname.startsWith("/marketing/")) {
    // Already localized internal tree: /marketing/en/... — serve directly
    const segments = pathname.split("/").filter(Boolean);
    // ["marketing", "en", ...]
    if (segments.length >= 2 && isAppLocale(segments[1])) {
      return NextResponse.next();
    }

    if (!isLocalDev || pathname === "/marketing" || !pathname.match(/^\/marketing\/(en|ru)(\/|$)/)) {
      const localized = legacyPathToLocalized(pathname, DEFAULT_LOCALE);
      if (localized) {
        return NextResponse.redirect(new URL(localized + request.nextUrl.search, request.url), 301);
      }
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
    if (isLocalePrefixedPath(pathname)) {
      const rewritten = rewriteLocalizedMarketing(request, pathname);
      if (rewritten) return rewritten;
    }

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
      return new NextResponse("User-agent: *\nDisallow: /\n", {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    if (pathname === "/sitemap.xml") {
      return NextResponse.redirect(`${getMarketingUrl().replace(/\/$/, "")}/sitemap.xml`, 301);
    }

    if (pathname.startsWith("/marketing") || isLocalePrefixedPath(pathname)) {
      const locale = localeFromPathname(pathname);
      if (locale) {
        return redirectToMarketing(request, pathname);
      }
      const clean = cleanPathFromInternal(pathname);
      const localized = legacyPathToLocalized(clean ?? pathname, DEFAULT_LOCALE);
      return redirectToMarketing(request, localized ?? localizedPath(DEFAULT_LOCALE, "/"));
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
    "/((?!_next/static|_next/image|favicon.ico|\\.well-known|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)",
  ],
};

// Silence unused in edge build when tree-shaken oddly
void SUPPORTED_LOCALES;
