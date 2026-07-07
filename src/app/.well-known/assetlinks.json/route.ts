import { NextResponse } from "next/server";

import { buildAndroidAssetLinks } from "@/lib/mobile/universal-links";

function readSha256Fingerprints(): string[] {
  const raw = process.env.ANDROID_APP_LINKS_SHA256?.trim();
  if (!raw) return [];
  return raw
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/** Android App Links — same invite/join paths as iOS Universal Links. */
export function GET() {
  const fingerprints = readSha256Fingerprints();
  if (fingerprints.length === 0) {
    return new NextResponse(
      [
        "Android App Links are not configured on this deployment.",
        "",
        "Set Vercel env ANDROID_APP_LINKS_SHA256 to the release keystore SHA-256 fingerprint",
        "(EAS credentials → Android → Keystore).",
      ].join("\n"),
      {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      },
    );
  }

  const body = JSON.stringify(buildAndroidAssetLinks(fingerprints));

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
