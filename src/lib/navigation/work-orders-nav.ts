import type { OrderListFilter } from "@/components/work-orders/work-order-list-panel";

export const WORK_ORDERS_SECTIONS = [
  { value: "orders", label: "Заказ-наряды" },
  { value: "clients", label: "Клиенты" },
  { value: "vehicles", label: "Автомобили" },
] as const;

export type WorkOrdersSection = (typeof WORK_ORDERS_SECTIONS)[number]["value"];

export const WORK_ORDERS_FILTERS: { value: OrderListFilter; label: string }[] = [
  { value: "open", label: "Открытые" },
  { value: "all", label: "Все" },
  { value: "done", label: "Закрытые" },
];

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
