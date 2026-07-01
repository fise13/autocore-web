import type { ReactNode } from "react";

import type { SidebarBlockId, SidebarNavItemId } from "@/lib/navigation/sidebar-customization";

export type AutocoreNavItem = {
  title: string;
  path?: string;
  icon?: ReactNode;
  isActive?: boolean;
  badge?: number;
  navId?: SidebarNavItemId;
  blockId?: SidebarBlockId;
  subItems?: AutocoreNavItem[];
};

export type AutocoreNavGroup = {
  label?: string;
  blockId?: SidebarBlockId;
  items: AutocoreNavItem[];
};
