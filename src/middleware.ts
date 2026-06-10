import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  cleanPathFromInternal,
  isMarketingContentPath,
  resolveMarketingPathFromClean,
} from "@/lib/seo/marketing-paths";
import { getAppUrl, getHostKind, getMarketingUrl, isAppRoute, isMarketingPublicPath } from "@/lib/site-urls";

function stripWww(host: string): string {
  return host.replace(/^www\./i, "");
}

function redirectToMarketing(request: NextRequest, pathname: string): NextResponse {
  const target = new URL(pathname + request.nextUrl.search, getMarketingUrl());
  return NextResponse.redirect(target, 308);
}

function redirectAppRouteFromMarketing(request: NextRequest): NextResponse {
  const target = new URL(request.nextUrl.pathname + request.nextUrl.search, getAppUrl());
  return NextResponse.redirect(target, 308);
}

/** Marketing host + unified localhost: clean URLs + legacy /marketing/* → 301. */
function handleMarketingRoutes(request: NextRequest, pathname: string, isMarketingHost: boolean): NextResponse {
  if (isMarketingHost) {
    const hostWithoutPort = (request.headers.get("host") ?? "").split(":")[0] ?? "";
    const marketingHost = stripWww(getMarketingUrl().replace(/^https?:\/\//, "").split(":")[0] ?? "");

    if (hostWithoutPort.toLowerCase().startsWith("www.") && marketingHost) {
      const canonical = new URL(request.url);
      canonical.hostname = marketingHost;
      return NextResponse.redirect(canonical, 301);
    }
  }

  if (pathname === "/" && isMarketingHost) {
    return NextResponse.rewrite(new URL("/marketing", request.url));
  }

  const internalFromClean = resolveMarketingPathFromClean(pathname);
  if (internalFromClean) {
    return NextResponse.rewrite(new URL(internalFromClean + request.nextUrl.search, request.url));
  }

  if (pathname.startsWith("/marketing")) {
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

  if (kind === "marketing") {
    return handleMarketingRoutes(request, pathname, true);
  }

  if (kind === "local" && isMarketingContentPath(pathname) && !isAppRoute(pathname)) {
    return handleMarketingRoutes(request, pathname, false);
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
