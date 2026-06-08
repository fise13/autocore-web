import { readFileSync } from "node:fs";
import { join } from "node:path";

import { NextResponse } from "next/server";

const ASSOCIATION_PATH = join(
  process.cwd(),
  "public/.well-known/apple-developer-domain-association",
);

function readAssociationFile(): string | null {
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
    return NextResponse.json(
      {
        error:
          "Apple domain association not configured. Download the file from Apple Developer → Services ID → Configure and set APPLE_DEVELOPER_DOMAIN_ASSOCIATION or commit public/.well-known/apple-developer-domain-association",
      },
      { status: 404 },
    );
  }

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
