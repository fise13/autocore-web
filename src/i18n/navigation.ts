import { createNavigation } from "next-intl/navigation";

import { routing } from "@/i18n/routing";

/** Locale-aware navigation for the marketing site (public paths like `/en/product`). */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
