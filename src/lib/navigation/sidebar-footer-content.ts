import { getHighlightedProductUpdate } from "@/lib/product/product-updates";
import { userCopy } from "@/lib/user-copy";

const helpHref = "/help";
const changelogHref = "/changelog";
const statusHref = "/status";

/** Locale-aware sidebar footer copy — call from render, do not cache at module load. */
export function getSidebarFooterContent() {
  const highlight = getHighlightedProductUpdate();

  return {
    announcement: highlight
      ? {
          id: highlight.id,
          badge: userCopy.layout.newBadge,
          title: highlight.title,
          description: highlight.summary,
          href: changelogHref,
          linkLabel: userCopy.layout.whatsNew,
        }
      : null,
    help: {
      label: userCopy.layout.help,
      href: helpHref,
      external: false,
    },
    status: {
      label: userCopy.layout.systemStatus,
      href: statusHref,
      external: false,
    },
  };
}

/** @deprecated Prefer getSidebarFooterContent() for locale-aware labels. */
export const sidebarFooterContent = getSidebarFooterContent();
