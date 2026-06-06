import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getAppUrl, getHostKind, getMarketingUrl, isAppRoute } from "@/lib/site-urls";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const kind = getHostKind(host);
  const { pathname } = request.nextUrl;

  if (kind === "marketing") {
    if (pathname === "/") {
      return NextResponse.rewrite(new URL("/marketing", request.url));
    }
    if (isAppRoute(pathname) && pathname !== "/marketing") {
      const target = new URL(pathname + request.nextUrl.search, getAppUrl());
      return NextResponse.redirect(target);
    }
    return NextResponse.next();
  }

  if (kind === "app" && pathname.startsWith("/marketing")) {
    const target = new URL(pathname + request.nextUrl.search, getMarketingUrl());
    return NextResponse.redirect(target);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)"],
};
