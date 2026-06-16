import { NextResponse } from "next/server";

import {
  DESKTOP_DOWNLOAD_FILES,
  getDesktopDownloadLinks,
} from "@/lib/desktop/desktop-downloads";
import { hasLocalDesktopInstaller } from "@/lib/desktop/desktop-downloads.server";

export const runtime = "nodejs";

function isAvailable(platform: keyof typeof DESKTOP_DOWNLOAD_FILES): boolean {
  return hasLocalDesktopInstaller(platform);
}

export function GET() {
  const links = getDesktopDownloadLinks();

  const platforms = {
    mac: {
      url: links.mac,
      available: isAvailable("mac"),
      fileName: DESKTOP_DOWNLOAD_FILES.mac,
    },
    windows: {
      url: links.windows,
      available: isAvailable("windows"),
      fileName: DESKTOP_DOWNLOAD_FILES.windows,
    },
  };

  return NextResponse.json(
    { platforms },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
