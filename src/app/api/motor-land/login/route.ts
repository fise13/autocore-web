import { NextResponse } from "next/server";

import {
  DESK_COOKIE,
  DESK_COOKIE_MAX_AGE,
  deskPaths,
  deskToken,
  isValidDeskLogin,
} from "@/lib/motor-land/desk-login";
import { normalizeHost } from "@/lib/site-urls";

export const runtime = "nodejs";

/** The `/docs/login` form posts here: a plain form, so it works without JS. */
export async function POST(request: Request) {
  const form = await request.formData();
  const user = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const paths = deskPaths(normalizeHost(request.headers.get("host") ?? ""));
  const { MOTOR_LAND_DOCS_USER, MOTOR_LAND_DOCS_PASSWORD } = process.env;

  if (!(await isValidDeskLogin(user, password, MOTOR_LAND_DOCS_USER, MOTOR_LAND_DOCS_PASSWORD))) {
    return NextResponse.redirect(new URL(`${paths.login}?error=1`, request.url), 303);
  }

  const response = NextResponse.redirect(new URL(paths.desk, request.url), 303);
  response.cookies.set(DESK_COOKIE, (await deskToken(MOTOR_LAND_DOCS_USER, MOTOR_LAND_DOCS_PASSWORD))!, {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: DESK_COOKIE_MAX_AGE,
  });
  return response;
}
