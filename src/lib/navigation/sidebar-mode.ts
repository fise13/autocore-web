export type SidebarMode =
  | "home"
  | "motors"
  | "sold"
  | "specific"
  | "warehouse"
  | "work_orders"
  | "accounting"
  | "other";

export function resolveSidebarMode(pathname: string): SidebarMode {
  if (pathname === "/") return "home";
  if (pathname === "/motors") return "motors";
  if (pathname === "/sold") return "sold";
  if (pathname.startsWith("/specific/")) return "specific";
  if (pathname === "/warehouse") return "warehouse";
  if (pathname === "/work-orders" || pathname.startsWith("/work-orders/")) return "work_orders";
  if (pathname === "/accounting" || pathname.startsWith("/accounting/")) return "accounting";
  return "other";
}

export function showSpecificCategoriesInSidebar(mode: SidebarMode): boolean {
  return mode === "motors" || mode === "specific";
}

export function showBrandFiltersInSidebar(mode: SidebarMode): boolean {
  return mode === "motors" || mode === "sold";
}
