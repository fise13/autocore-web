import { getDesktopInfo } from "@/platform/desktop-info";
import { hasNativeBridge } from "@/platform/platform-target";

export type UpdateCheckResult =
  /** Not the desktop app, or this build was not signed for updates. */
  | { status: "unsupported" }
  | { status: "up-to-date" }
  | { status: "available"; version: string; notes?: string }
  | { status: "failed"; message: string };

/**
 * Ask the update endpoint whether a newer signed build exists.
 *
 * Returns `unsupported` rather than throwing for locally built binaries: the
 * updater plugin is only registered when `plugins.updater` is present in the
 * config, which `scripts/sync-tauri-updater.mjs` writes from CI environment
 * variables at build time. See `docs/DESKTOP-RELEASE.md`.
 */
export async function checkForUpdate(): Promise<UpdateCheckResult> {
  if (!hasNativeBridge()) return { status: "unsupported" };

  const info = await getDesktopInfo();
  if (!info?.updaterEnabled) return { status: "unsupported" };

  try {
    const { updaterNative } = await import("@/platform/desktop/bridge");
    const { check } = await updaterNative();
    const update = await check();
    if (!update) return { status: "up-to-date" };
    return { status: "available", version: update.version, notes: update.body };
  } catch (error) {
    return {
      status: "failed",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Download and install a pending update, then restart into it.
 *
 * Signature verification happens inside the plugin against the public key baked
 * into the build; an unsigned or mis-signed artifact is rejected before it is
 * ever written. `relaunch()` does not return when it succeeds.
 */
export async function installUpdate(
  onProgress?: (downloaded: number, total: number | null) => void,
): Promise<UpdateCheckResult> {
  if (!hasNativeBridge()) return { status: "unsupported" };

  try {
    const { processNative, updaterNative } = await import("@/platform/desktop/bridge");
    const { check } = await updaterNative();
    const update = await check();
    if (!update) return { status: "up-to-date" };

    let downloaded = 0;
    let total: number | null = null;

    await update.downloadAndInstall((event) => {
      if (event.event === "Started") {
        total = event.data.contentLength ?? null;
      } else if (event.event === "Progress") {
        downloaded += event.data.chunkLength;
      }
      onProgress?.(downloaded, total);
    });

    const { relaunch } = await processNative();
    await relaunch();
    return { status: "available", version: update.version };
  } catch (error) {
    return {
      status: "failed",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
