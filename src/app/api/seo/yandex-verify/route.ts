import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Serves the Yandex Webmaster HTML verification body when env is set.
 * Paired with the rewrite `/yandex_*.html` → this route in `next.config.ts`.
 *
 * Two notes on how this actually behaves in production:
 *
 * 1. `public/yandex_ea9a03126f4b913f.html` is a committed static file, and
 *    `/public` wins over rewrites — so for that one path this route never runs.
 *    It is the live, already-verified token; it stays put. This route covers any
 *    other token configured through env.
 * 2. `YANDEX_WEBMASTER_VERIFICATION_PATH` was read and then never compared
 *    against anything, so the route happily returned the token for *any*
 *    `/yandex_*.html` URL a crawler or scanner asked for. It is now matched.
 */
export async function GET(request: NextRequest) {
  const expectedPath = process.env.YANDEX_WEBMASTER_VERIFICATION_PATH?.trim();
  const body = process.env.YANDEX_WEBMASTER_VERIFICATION_BODY?.trim();

  if (!expectedPath || !body) {
    return new NextResponse("Not configured", { status: 404 });
  }

  const requested = request.nextUrl.pathname.replace(/^\//, "");
  if (requested !== expectedPath.replace(/^\//, "")) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
      "X-Robots-Tag": "noindex",
    },
  });
}
