import { existsSync } from "node:fs";
import { join } from "node:path";

import { NextResponse } from "next/server";

import {
  DESKTOP_DOWNLOAD_FILES,
  getDesktopDownloadLinks,
  resolveDesktopDownloadPath,
} from "@/lib/desktop/desktop-downloads";

export const runtime = "nodejs";

function isAvailable(fileName: string): boolean {
  const path = resolveDesktopDownloadPath(fileName);
  return existsSync(path);
}

export function GET() {
  const links = getDesktopDownloadLinks();

  const platforms = {
    mac: {
      url: links.mac,
      available: isAvailable(DESKTOP_DOWNLOAD_FILES.mac),
      fileName: DESKTOP_DOWNLOAD_FILES.mac,
    },
    windows: {
      url: links.windows,
      available: isAvailable(DESKTOP_DOWNLOAD_FILES.windows),
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
