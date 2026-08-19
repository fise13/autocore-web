/**
 * The only module that talks to `@tauri-apps/*`.
 *
 * Everything here is behind a dynamic `import()` reached from a
 * `hasNativeBridge()` branch, which keeps the Tauri client out of the web
 * bundle: the browser build never evaluates these modules, and the desktop build
 * loads them as a separate chunk on first native call.
 *
 * Product code must not import this file. Use the capability modules in
 * `src/platform` instead — they are the seam that keeps `invoke()` from
 * spreading through the component tree.
 */

/** Commands declared in `src-tauri/build.rs` and granted in `capabilities/`. */
export type NativeCommand =
  | "desktop_save_file"
  | "desktop_print_document"
  | "desktop_print_page"
  | "desktop_info";

export async function invokeNative<T>(
  command: NativeCommand,
  args?: Record<string, unknown>,
): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command, args);
}

export async function listenNative<T>(
  event: string,
  handler: (payload: T) => void,
): Promise<() => void> {
  const { listen } = await import("@tauri-apps/api/event");
  return listen<T>(event, (message) => handler(message.payload));
}

export async function openUrlNative(url: string): Promise<void> {
  const { openUrl } = await import("@tauri-apps/plugin-opener");
  await openUrl(url);
}

export async function clipboardNative() {
  return import("@tauri-apps/plugin-clipboard-manager");
}

export async function notificationNative() {
  return import("@tauri-apps/plugin-notification");
}

export async function updaterNative() {
  return import("@tauri-apps/plugin-updater");
}

export async function processNative() {
  return import("@tauri-apps/plugin-process");
}

export async function windowNative() {
  return import("@tauri-apps/api/window");
}

/**
 * Tauri's IPC is JSON, so raw bytes would cost one JSON number per byte.
 * Base64 is ~4x smaller on the wire for the multi-megabyte PDFs this carries.
 * Chunked because spreading a large `Uint8Array` into `String.fromCharCode`
 * overflows the call stack.
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const CHUNK_SIZE = 0x8000;
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK_SIZE));
  }

  return btoa(binary);
}
