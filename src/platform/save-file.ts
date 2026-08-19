import { hasNativeBridge } from "@/platform/platform-target";

export type SaveFileFilter = {
  name: string;
  extensions: string[];
};

export type SaveFileRequest = {
  /** Suggested name. On desktop the user can change it in the dialog. */
  filename: string;
  blob: Blob;
  /** Dialog filters. Ignored on web, where the browser decides. */
  filters?: SaveFileFilter[];
};

export type SaveFileResult =
  /** Desktop: written to a location the user picked. */
  | { status: "saved"; path: string }
  /** Desktop: the user dismissed the dialog. Not a failure. */
  | { status: "cancelled" }
  /** Web: handed to the browser's download manager. */
  | { status: "downloaded" };

/** The browser path, unchanged from what the web app has always done. */
function downloadInBrowser({ filename, blob }: SaveFileRequest): SaveFileResult {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return { status: "downloaded" };
}

/**
 * Write a generated file where the user wants it.
 *
 * On desktop this is not a nicety. A webview has no download manager, so the
 * `<a download>` click the web app relies on is silently inert inside the
 * shell — every PDF and CSV export appeared to succeed and produced no file.
 * Here the desktop branch opens a native save dialog instead, and the web branch
 * keeps the browser download it always had.
 */
export async function saveFile(request: SaveFileRequest): Promise<SaveFileResult> {
  if (!hasNativeBridge()) {
    return downloadInBrowser(request);
  }

  try {
    const { blobToBase64, invokeNative } = await import("@/platform/desktop/bridge");
    return await invokeNative<SaveFileResult>("desktop_save_file", {
      request: {
        suggestedName: request.filename,
        contentsBase64: await blobToBase64(request.blob),
        filters: request.filters ?? [],
      },
    });
  } catch {
    // A capability gap or an older shell build should not cost the user their
    // export — fall back to the browser download rather than failing.
    return downloadInBrowser(request);
  }
}
