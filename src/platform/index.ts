/**
 * Platform adapter: one API, two implementations.
 *
 * AutoCore Desktop is the same React application as AutoCore Web, hosted in a
 * Tauri window. The handful of things that genuinely differ — where a file
 * lands, how a document prints, where an external link opens — go through this
 * module, so nothing in `src/components` needs to know which client it is
 * running in and no component calls `invoke()` directly.
 *
 *     component → service → src/platform → web | desktop
 *
 * Rules:
 * - Add a capability here only when the web API cannot do the job at all.
 * - Every desktop path degrades to the web path on failure, so a stale shell
 *   build loses polish, never a feature.
 * - `@tauri-apps/*` is imported only from `src/platform/desktop/bridge.ts`, and
 *   only behind a dynamic import, so the web bundle never carries it.
 */

export { getPlatformTarget, hasNativeBridge, isDesktopShell } from "@/platform/platform-target";
export type { PlatformTarget } from "@/platform/platform-target";

export { saveFile } from "@/platform/save-file";
export type { SaveFileFilter, SaveFileRequest, SaveFileResult } from "@/platform/save-file";

export { openAppUrl, openExternalUrl } from "@/platform/open-external";
export { readClipboardText, writeClipboardText } from "@/platform/clipboard";
export { printCurrentPage, printPdfBlob } from "@/platform/print";
export { notifyDesktop } from "@/platform/notify";
export type { DesktopNotification } from "@/platform/notify";

export { onDesktopDeepLink, onDesktopMenuAction } from "@/platform/desktop-events";
export type { DesktopDeepLink, DesktopMenuAction } from "@/platform/desktop-events";

export { publishDesktopHandoffUrl } from "@/platform/handoff";

export { getDesktopInfo } from "@/platform/desktop-info";
export type { DesktopInfo } from "@/platform/desktop-info";

export { checkForUpdate, installUpdate } from "@/platform/updater";
export type { UpdateCheckResult } from "@/platform/updater";
