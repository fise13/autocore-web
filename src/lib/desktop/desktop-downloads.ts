import { existsSync } from "node:fs";
import { join } from "node:path";

import { DEFAULT_APP_ORIGIN, DEFAULT_MARKETING_ORIGIN, ensureHttpScheme, getAppUrl, getMarketingUrl } from "@/lib/site-urls";

export type DesktopDownloadLinks = {
  mac: string;
  windows: string;
  appLoginUrl: string;
};

export const DESKTOP_DOWNLOAD_FILES = {
  mac: "AutoCore-mac.dmg",
  windows: "AutoCore-windows.exe",
} as const;

export function resolveDesktopDownloadPath(fileName: string): string {
  return join(process.cwd(), "public", "downloads", fileName);
}

function downloadsBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_DESKTOP_DOWNLOADS_BASE_URL?.trim();
  if (fromEnv) return ensureHttpScheme(fromEnv);

  const marketing = getMarketingUrl();
  const app = getAppUrl();
  if (marketing === app) return "";

  return marketing || DEFAULT_MARKETING_ORIGIN;
}

function appLoginOrigin(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_DESKTOP_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return ensureHttpScheme(fromEnv);
  return DEFAULT_APP_ORIGIN;
}

function resolveDownloadUrl(
  envOverride: string | undefined,
  fileName: string,
): string {
  const override = envOverride?.trim();
  if (override) return override;

  const base = downloadsBaseUrl();
  const path = `/downloads/${fileName}`;
  return base ? `${base.replace(/\/$/, "")}${path}` : path;
}

/** Public download links for the native desktop shell (Tauri). */
export function getDesktopDownloadLinks(): DesktopDownloadLinks {
  return {
    mac: resolveDownloadUrl(
      process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_MAC,
      DESKTOP_DOWNLOAD_FILES.mac,
    ),
    windows: resolveDownloadUrl(
      process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_WIN,
      DESKTOP_DOWNLOAD_FILES.windows,
    ),
    appLoginUrl: `${appLoginOrigin()}/login`,
  };
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
