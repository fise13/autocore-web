import { readFileSync } from "node:fs";
import { join } from "node:path";

import { NextResponse } from "next/server";

const ASSOCIATION_PATH = join(
  process.cwd(),
  "public/.well-known/apple-developer-domain-association",
);

function readAssociationFile(): string | null {
  const fromEnvB64 = process.env.APPLE_DEVELOPER_DOMAIN_ASSOCIATION_BASE64?.trim();
  if (fromEnvB64) {
    try {
      return Buffer.from(fromEnvB64, "base64").toString("utf8").trim();
    } catch {
      return null;
    }
  }

  const fromEnv = process.env.APPLE_DEVELOPER_DOMAIN_ASSOCIATION?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  try {
    return readFileSync(ASSOCIATION_PATH, "utf8").trim();
  } catch {
    return null;
  }
}

/** Apple Sign in with Apple domain verification (required for web OAuth). */
export function GET() {
  const body = readAssociationFile();
  if (!body) {
    return new NextResponse(
      [
        "Apple domain association is not configured on this deployment.",
        "",
        "Fix:",
        "1. Apple Developer → Services ID com.wise.autocore.web → Configure → Download verification file",
        "2. Either commit public/.well-known/apple-developer-domain-association",
        "   or set Vercel env APPLE_DEVELOPER_DOMAIN_ASSOCIATION_BASE64 (run scripts/setup-apple-domain-association.mjs --base64)",
        "",
        "Until this URL returns HTTP 200, Apple Sign-In shows «Регистрация не выполнена».",
      ].join("\n"),
      {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      },
    );
  }

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
