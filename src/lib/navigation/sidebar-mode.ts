export type SidebarMode =
  | "home"
  | "motors"
  | "sold"
  | "specific"
  | "warehouse"
  | "work_orders"
  | "accounting"
  | "documents"
  | "team"
  | "activity"
  | "other";

export function resolveSidebarMode(pathname: string): SidebarMode {
  if (pathname === "/") return "home";
  if (pathname === "/motors") return "motors";
  if (pathname === "/sold") return "sold";
  if (pathname.startsWith("/specific/")) return "specific";
  if (pathname === "/warehouse") return "warehouse";
  if (pathname === "/work-orders" || pathname.startsWith("/work-orders/")) return "work_orders";
  if (pathname === "/accounting" || pathname.startsWith("/accounting/")) return "accounting";
  if (pathname === "/documents" || pathname.startsWith("/documents/")) return "documents";
  if (pathname === "/team" || pathname.startsWith("/team/")) return "team";
  if (pathname === "/activity" || pathname.startsWith("/activity/")) return "activity";
  return "other";
}

export function showSpecificCategoriesInSidebar(mode: SidebarMode): boolean {
  return mode === "motors" || mode === "specific";
}

export function showBrandFiltersInSidebar(mode: SidebarMode): boolean {
  return mode === "motors" || mode === "sold";
}

/** Section actions panel — only when this route has contextual controls. */
export function showSidebarContextInSidebar(mode: SidebarMode): boolean {
  return (
    mode === "motors" ||
    mode === "specific" ||
    mode === "sold" ||
    mode === "work_orders" ||
    mode === "warehouse" ||
    mode === "accounting"
  );
}
