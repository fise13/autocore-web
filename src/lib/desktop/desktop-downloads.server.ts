import "server-only";

import { existsSync } from "node:fs";
import { join } from "node:path";

import { DESKTOP_DOWNLOAD_FILES } from "@/lib/desktop/desktop-downloads";

export function resolveDesktopDownloadPath(fileName: string): string {
  return join(process.cwd(), "public", "downloads", fileName);
}

export function hasLocalDesktopInstaller(platform: keyof typeof DESKTOP_DOWNLOAD_FILES): boolean {
  return existsSync(resolveDesktopDownloadPath(DESKTOP_DOWNLOAD_FILES[platform]));
}

export function hasDesktopDownloadsConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_MAC ||
      process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_WIN ||
      hasLocalDesktopInstaller("mac") ||
      hasLocalDesktopInstaller("windows"),
  );
}
