import { NextResponse } from "next/server";

import { DESK_COOKIE, deskPaths } from "@/lib/motor-land/desk-login";
import { normalizeHost } from "@/lib/site-urls";

export async function POST(request: Request) {
  const { login } = deskPaths(normalizeHost(request.headers.get("host") ?? ""));
  const response = NextResponse.redirect(new URL(login, request.url), 303);
  response.cookies.delete(DESK_COOKIE);
  return response;
}
