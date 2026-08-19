"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/ui/toast-provider";
import { userCopy } from "@/lib/user-copy";
import {
  checkForUpdate,
  hasNativeBridge,
  installUpdate,
  onDesktopDeepLink,
  onDesktopMenuAction,
  printCurrentPage,
} from "@/platform";
import { runDesktopAction } from "@/platform/desktop-actions";

/**
 * The single place the desktop shell talks to the React app.
 *
 * Renders nothing and does nothing on web. Everything it wires up is native
 * plumbing the browser already provided for free — menu commands, `autocore://`
 * links, the window title — so no product component needs to know it exists.
 */
export function DesktopShellProvider() {
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!hasNativeBridge()) return;

    const stopMenu = onDesktopMenuAction((action) => {
      switch (action) {
        case "save":
          // Only meaningful where a screen registered a handler.
          runDesktopAction("save");
          break;

        case "print":
          if (!runDesktopAction("print")) void printCurrentPage();
          break;

        case "settings":
          router.push("/settings");
          break;

        case "check-updates":
          void runUpdateCheck();
          break;
      }
    });

    const stopDeepLinks = onDesktopDeepLink((link) => {
      // The shell also navigates the window, so this is the fast path: an
      // in-app route change keeps React state instead of reloading the app.
      router.replace(link.path);
    });

    return () => {
      stopMenu();
      stopDeepLinks();
    };

    async function runUpdateCheck() {
      const copy = userCopy.desktop.updates;
      const result = await checkForUpdate();

      if (result.status === "unsupported") {
        toast({ title: copy.unsupported });
        return;
      }
      if (result.status === "up-to-date") {
        toast({ title: copy.upToDate, variant: "success" });
        return;
      }
      if (result.status === "failed") {
        toast({ title: copy.checkFailed, description: result.message, variant: "error" });
        return;
      }

      toast({ title: copy.downloading(result.version) });
      const installed = await installUpdate();
      if (installed.status === "failed") {
        toast({ title: copy.installFailed, description: installed.message, variant: "error" });
      }
    }
  }, [router, toast]);

  // Keep the native window title in step with the page. A webview pointed at a
  // remote origin does not propagate `document.title` on its own, so without
  // this every window and Window-menu entry just reads "AutoCore".
  useEffect(() => {
    if (!hasNativeBridge()) return;

    let cancelled = false;
    let lastTitle = "";

    const sync = async () => {
      const title = document.title.trim();
      if (!title || title === lastTitle || cancelled) return;
      lastTitle = title;
      try {
        const { windowNative } = await import("@/platform/desktop/bridge");
        const { getCurrentWindow } = await windowNative();
        await getCurrentWindow().setTitle(title);
      } catch {
        // Title syncing is cosmetic; never let it surface as an error.
      }
    };

    void sync();

    const titleElement = document.querySelector("title");
    if (!titleElement) return () => {
      cancelled = true;
    };

    const observer = new MutationObserver(() => void sync());
    observer.observe(titleElement, { childList: true });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  return null;
}
