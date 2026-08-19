import { hasNativeBridge } from "@/platform/platform-target";
import { userCopy } from "@/lib/user-copy";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function waitForPdfFrame(frame: HTMLIFrameElement, timeoutMs = 15_000): Promise<void> {
  if (frame.contentDocument?.readyState === "complete") {
    await sleep(900);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error(userCopy.documents.errors.printLoadTimeout));
    }, timeoutMs);

    const onLoad = () => {
      cleanup();
      resolve();
    };

    const cleanup = () => {
      window.clearTimeout(timer);
      frame.removeEventListener("load", onLoad);
    };

    frame.addEventListener("load", onLoad, { once: true });
  });

  await sleep(900);
}

/** The browser path: render the PDF in a hidden frame and print that frame. */
async function printPdfInBrowser(blob: Blob): Promise<void> {
  const url = URL.createObjectURL(blob);
  const errors = userCopy.documents.errors;

  try {
    const frame = document.createElement("iframe");
    frame.setAttribute("title", errors.printTitle);
    frame.style.cssText =
      "position:fixed;left:0;top:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;";
    frame.src = url;
    document.body.appendChild(frame);

    try {
      await waitForPdfFrame(frame);
      const printWindow = frame.contentWindow;
      if (!printWindow) {
        throw new Error(errors.printWindowFailed);
      }

      printWindow.focus();
      printWindow.print();
    } finally {
      window.setTimeout(() => frame.remove(), 120_000);
    }
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
  }
}

/**
 * Print a generated PDF.
 *
 * The browser path above does not work in the desktop shell: WKWebView installs
 * no handler for `window.print()`, so the call resolves and nothing happens.
 * Tauri 2 has no cross-platform print API for arbitrary bytes either, so desktop
 * stages the file and hands it to the OS PDF handler, which gives the user a real
 * print dialog with printer and paper selection.
 */
export async function printPdfBlob(blob: Blob, filename = "autocore-document.pdf"): Promise<void> {
  if (hasNativeBridge()) {
    try {
      const { blobToBase64, invokeNative } = await import("@/platform/desktop/bridge");
      await invokeNative<void>("desktop_print_document", {
        request: {
          suggestedName: filename,
          contentsBase64: await blobToBase64(blob),
        },
      });
      return;
    } catch {
      // Fall through: better a browser print attempt than no print at all.
    }
  }

  await printPdfInBrowser(blob);
}

/**
 * Print the page currently on screen — warehouse label sheets and the work-order
 * print view, which call `window.print()` directly.
 *
 * On macOS the shell runs WKWebView's own print operation, because the DOM call
 * is a no-op there. WebView2 on Windows implements `window.print()` natively, so
 * the fallback is the correct path rather than a degraded one.
 */
export async function printCurrentPage(): Promise<void> {
  if (hasNativeBridge()) {
    try {
      const { invokeNative } = await import("@/platform/desktop/bridge");
      await invokeNative<void>("desktop_print_page");
      return;
    } catch {
      // Fall through to the DOM print below.
    }
  }

  window.print();
}
