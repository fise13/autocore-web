import type { OrderListFilter } from "@/components/work-orders/work-order-list-panel";
import { userCopy } from "@/lib/user-copy";

export type WorkOrdersSection = "orders" | "clients" | "vehicles";

/** Locale-aware section labels for work-orders navigation. */
export function getWorkOrdersSections(): { value: WorkOrdersSection; label: string }[] {
  const sidebar = userCopy.workOrders.sidebar;
  return [
    { value: "orders", label: sidebar.section },
    { value: "clients", label: sidebar.clients },
    { value: "vehicles", label: sidebar.vehicles },
  ];
}

/** Locale-aware filter labels for the orders list. */
export function getWorkOrdersFilters(): { value: OrderListFilter; label: string }[] {
  const filters = userCopy.workOrders.filters;
  return [
    { value: "open", label: filters.open },
    { value: "all", label: filters.all },
    { value: "done", label: filters.done },
  ];
}

/** @deprecated Prefer `getWorkOrdersSections()` — labels follow active locale. */
export const WORK_ORDERS_SECTIONS = getWorkOrdersSections;

/** @deprecated Prefer `getWorkOrdersFilters()` — labels follow active locale. */
export const WORK_ORDERS_FILTERS = getWorkOrdersFilters;

export function parseWorkOrdersSection(value: string | null): WorkOrdersSection {
  if (value === "clients" || value === "vehicles") return value;
  return "orders";
}

export function parseWorkOrdersFilter(value: string | null): OrderListFilter {
  if (value === "all" || value === "done") return value;
  return "open";
}

export function workOrdersHref(params: {
  section?: WorkOrdersSection;
  filter?: OrderListFilter;
  create?: boolean;
  clientId?: string;
  order?: string;
}): string {
  const search = new URLSearchParams();
  const section = params.section ?? "orders";
  const filter = params.filter ?? "open";

  if (section !== "orders") search.set("section", section);
  if (section === "orders" && filter !== "open") search.set("filter", filter);
  if (params.create) search.set("create", "1");
  if (params.clientId) search.set("clientId", params.clientId);
  if (params.order) search.set("order", params.order);

  const query = search.toString();
  return query ? `/work-orders?${query}` : "/work-orders";
}
