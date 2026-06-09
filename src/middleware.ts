import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  cleanPathFromInternal,
  resolveMarketingPathFromClean,
  usesCleanMarketingPaths,
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

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const kind = getHostKind(host);
  const { pathname } = request.nextUrl;

  if (kind === "marketing") {
    const hostWithoutPort = host.split(":")[0] ?? "";
    const marketingHost = stripWww(getMarketingUrl().replace(/^https?:\/\//, "").split(":")[0] ?? "");

    if (hostWithoutPort.toLowerCase().startsWith("www.") && marketingHost) {
      const canonical = new URL(request.url);
      canonical.hostname = marketingHost;
      return NextResponse.redirect(canonical, 301);
    }

    if (pathname === "/") {
      return NextResponse.rewrite(new URL("/marketing", request.url));
    }

    const internalFromClean = resolveMarketingPathFromClean(pathname);
    if (internalFromClean) {
      return NextResponse.rewrite(new URL(internalFromClean + request.nextUrl.search, request.url));
    }

    if (pathname.startsWith("/marketing")) {
      const clean = cleanPathFromInternal(pathname);
      if (clean && usesCleanMarketingPaths()) {
        return NextResponse.redirect(new URL(clean + request.nextUrl.search, request.url), 301);
      }
    }

    if (isAppRoute(pathname) && pathname !== "/marketing") {
      return redirectAppRouteFromMarketing(request);
    }

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
      const targetPath = clean && usesCleanMarketingPaths() ? clean : pathname;
      return redirectToMarketing(request, targetPath);
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
