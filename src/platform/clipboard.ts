import { hasNativeBridge } from "@/platform/platform-target";

/**
 * Clipboard access, native-first on desktop.
 *
 * `navigator.clipboard.readText()` is unreliable in WKWebView — it needs a fresh
 * user activation and often resolves empty — and paste is a core workflow in the
 * Excel-style inventory and motors grids. The desktop branch therefore asks the
 * OS clipboard directly and only falls back to the DOM API.
 */
async function nativeClipboard() {
  if (!hasNativeBridge()) return null;
  try {
    const { clipboardNative } = await import("@/platform/desktop/bridge");
    return await clipboardNative();
  } catch {
    return null;
  }
}

export async function writeClipboardText(text: string): Promise<boolean> {
  const native = await nativeClipboard();
  if (native) {
    try {
      await native.writeText(text);
      return true;
    } catch {
      // Fall through to the browser paths.
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return writeClipboardTextLegacy(text);
  }
}

/** Pre-async-clipboard fallback, kept for older WebKit and insecure contexts. */
function writeClipboardTextLegacy(text: string): boolean {
  try {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.left = "-9999px";
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(field);
    return copied;
  } catch {
    return false;
  }
}

export async function readClipboardText(): Promise<string> {
  const native = await nativeClipboard();
  if (native) {
    try {
      const text = await native.readText();
      if (text) return text;
    } catch {
      // Fall through to the browser path.
    }
  }

  try {
    return await navigator.clipboard.readText();
  } catch {
    return "";
  }
}
