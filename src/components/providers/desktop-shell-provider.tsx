"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useToast } from "@/components/ui/toast-provider";
import { userCopy } from "@/lib/user-copy";
import {
  checkForUpdate,
  hasNativeBridge,
  installUpdate,
  onDesktopDeepLink,
  onDesktopMenuAction,
  printCurrentPage,
  publishDesktopHandoffUrl,
} from "@/platform";
import { runDesktopAction } from "@/platform/desktop-actions";

/**
 * The single place the desktop shell talks to the React app.
 *
 * Renders nothing and does nothing on web. Everything it wires up is native
 * plumbing the browser already provided for free — menu commands and
 * `autocore://` links — so no product component needs to know it exists.
 * The native window title stays `AutoCore`; it is not mirrored from
 * `document.title` (login metadata is "Sign in" and would stick after auth).
 */
export function DesktopShellProvider() {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    if (!hasNativeBridge()) return;
    publishDesktopHandoffUrl(window.location.href);
  }, [pathname]);

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

  return null;
}
