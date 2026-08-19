import { hasNativeBridge } from "@/platform/platform-target";

export type DesktopNotification = {
  title: string;
  body?: string;
};

/**
 * Raise an OS notification, if the platform has one.
 *
 * Additive by design: callers keep showing their in-app toast either way, so a
 * background job finishing is visible whether or not the app is focused. Returns
 * false on web and when permission is refused, and never throws — a notification
 * failing must not interrupt the work that triggered it.
 */
export async function notifyDesktop(notification: DesktopNotification): Promise<boolean> {
  if (!hasNativeBridge()) return false;

  try {
    const { notificationNative } = await import("@/platform/desktop/bridge");
    const { isPermissionGranted, requestPermission, sendNotification } = await notificationNative();

    let granted = await isPermissionGranted();
    if (!granted) {
      granted = (await requestPermission()) === "granted";
    }
    if (!granted) return false;

    sendNotification({ title: notification.title, body: notification.body });
    return true;
  } catch {
    return false;
  }
}
