import { hasNativeBridge } from "@/platform/platform-target";

export type DesktopInfo = {
  appVersion: string;
  os: string;
  arch: string;
  /** False for unsigned or locally built binaries — hide "Check for updates". */
  updaterEnabled: boolean;
};

/** Shell build information, or null when not running in the desktop app. */
export async function getDesktopInfo(): Promise<DesktopInfo | null> {
  if (!hasNativeBridge()) return null;

  try {
    const { invokeNative } = await import("@/platform/desktop/bridge");
    return await invokeNative<DesktopInfo>("desktop_info");
  } catch {
    return null;
  }
}
