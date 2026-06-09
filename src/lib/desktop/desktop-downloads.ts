import { DEFAULT_PRODUCTION_APP_URL } from "@/lib/app-url";

export type DesktopDownloadLinks = {
  mac: string;
  windows: string;
  appLoginUrl: string;
};

function downloadsBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_DESKTOP_DOWNLOADS_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return DEFAULT_PRODUCTION_APP_URL;
}

function appLoginOrigin(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_DESKTOP_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return DEFAULT_PRODUCTION_APP_URL;
}

/** Public download links for the native desktop shell (Tauri). */
export function getDesktopDownloadLinks(): DesktopDownloadLinks {
  const base = downloadsBaseUrl();
  return {
    mac:
      process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_MAC?.trim() ||
      `${base}/downloads/AutoCore-mac.dmg`,
    windows:
      process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_WIN?.trim() ||
      `${base}/downloads/AutoCore-windows.exe`,
    appLoginUrl: `${appLoginOrigin()}/login`,
  };
}

export function hasDesktopDownloadsConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_MAC ||
      process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_WIN,
  );
}
