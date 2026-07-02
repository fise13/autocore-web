import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

/**
 * Redirect http/www variants to the canonical marketing origin (https, no www).
 * GSC lists http:// and www. URLs as "page with redirect" — they must 301 here.
 */
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

/** Marketing host + unified localhost: clean URLs + legacy /marketing/* → 301. */
function handleMarketingRoutes(request: NextRequest, pathname: string, isMarketingHost: boolean): NextResponse {
  if (isMarketingHost) {
    const canonicalRedirect = redirectToCanonicalMarketingOrigin(request);
    if (canonicalRedirect) return canonicalRedirect;
  }

  if (pathname === "/" && isMarketingHost) {
    return NextResponse.rewrite(new URL("/marketing", request.url));
  }

  const internalFromClean = resolveMarketingPathFromClean(pathname);
  if (internalFromClean) {
    return NextResponse.rewrite(new URL(internalFromClean + request.nextUrl.search, request.url));
  }

  const isLocalDev = isLocalDevHost(request.headers.get("host") ?? "");

  // Localhost dev: serve /marketing/* directly (no clean-URL redirect).
  if (!isLocalDev && pathname.startsWith("/marketing")) {
    const clean = cleanPathFromInternal(pathname);
    if (clean) {
      return NextResponse.redirect(new URL(clean + request.nextUrl.search, request.url), 301);
    }
  }

  if (isMarketingHost && isAppRoute(pathname) && pathname !== "/marketing") {
    return redirectAppRouteFromMarketing(request);
  }

  return NextResponse.next();
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const kind = getHostKind(host);
  const { pathname } = request.nextUrl;
  const isLocalDev = isLocalDevHost(host);

  // Unified localhost: / serves marketing (internal /marketing), URL stays /.
  if (kind === "local" && isLocalDev && pathname === "/") {
    return NextResponse.rewrite(new URL("/marketing" + request.nextUrl.search, request.url));
  }

  if (kind === "marketing") {
    return handleMarketingRoutes(request, pathname, true);
  }

  if (kind === "local" && isMarketingContentPath(pathname) && !isAppRoute(pathname)) {
    return handleMarketingRoutes(request, pathname, false);
  }

  // Unified localhost: /marketing/* served directly (no redirect to /).
  if (kind === "local" && isLocalDev && pathname.startsWith("/marketing")) {
    return NextResponse.next();
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

    if (pathname.startsWith("/marketing")) {
      const clean = cleanPathFromInternal(pathname);
      return redirectToMarketing(request, clean ?? pathname);
    }

    if (isMarketingPublicPath(pathname) && pathname !== "/") {
      return redirectToMarketing(request, pathname);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|\\.well-known|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)",
  ],
};
