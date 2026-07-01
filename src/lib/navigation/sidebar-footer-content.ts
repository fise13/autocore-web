import { getHighlightedProductUpdate } from "@/lib/product/product-updates";

const helpHref = "/help";
const changelogHref = "/changelog";
const statusHref = "/status";

const highlight = getHighlightedProductUpdate();

export const sidebarFooterContent = {
  announcement: highlight
    ? {
        id: highlight.id,
        badge: "Новое",
        title: highlight.title,
        description: highlight.summary,
        href: changelogHref,
        linkLabel: "Что нового",
      }
    : null,
  help: {
    label: "Справка",
    href: helpHref,
    external: false,
  },
  status: {
    label: "Статус системы",
    href: statusHref,
    external: false,
  },
} as const;
