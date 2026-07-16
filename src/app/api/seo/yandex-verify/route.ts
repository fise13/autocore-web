import { NextResponse } from "next/server";

/**
 * Serves Yandex Webmaster HTML verification body when env is set.
 * Paired with rewrite `/yandex_*.html` → this route in next.config.ts.
 */
export async function GET() {
  const expectedPath = process.env.YANDEX_WEBMASTER_VERIFICATION_PATH?.trim();
  const body = process.env.YANDEX_WEBMASTER_VERIFICATION_BODY?.trim();

  if (!expectedPath || !body) {
    return new NextResponse("Not configured", { status: 404 });
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
