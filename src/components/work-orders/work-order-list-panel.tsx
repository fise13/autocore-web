"use client";

import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { Plus, Search, UserRound } from "lucide-react";

import { WorkOrder } from "@/domain/work-order";
import { CompanyEmployee } from "@/domain/rbac";
import { PayrollTransaction } from "@/domain/payroll-transaction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  workOrdersListItemVariants,
  workOrdersListVariants,
  workOrdersNavSpring,
  workOrdersSectionTransition,
} from "@/components/work-orders/work-orders-motion";
import { cn } from "@/lib/utils";
import { userCopy } from "@/lib/user-copy";
import { formatWorkOrderLabel, workOrderAssigneeSummary } from "@/lib/work-order/work-order-display";
import { STATUS_LABELS, statusTone } from "@/components/work-orders/work-order-copy";
import { isOpenStatus, money } from "@/components/work-orders/work-order-utils";

export type OrderListFilter = "all" | "open" | "done";

type WorkOrderListPanelProps = {
  orders: WorkOrder[];
  selectedOrderId: string | null;
  isCreating: boolean;
  search: string;
  filter: OrderListFilter;
  canEdit: boolean;
  employees: CompanyEmployee[];
  displayIndex: Map<string, number>;
  payrollByOrderId: Map<string, PayrollTransaction[]>;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: OrderListFilter) => void;
  onSelectOrder: (orderId: string) => void;
  onStartCreate: () => void;
};

const FILTER_OPTIONS: { value: OrderListFilter; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "open", label: "Открытые" },
  { value: "done", label: "Закрытые" },
];

export function WorkOrderListPanel({
  orders,
  selectedOrderId,
  isCreating,
  search,
  filter,
  canEdit,
  employees,
  displayIndex,
  payrollByOrderId,
  onSearchChange,
  onFilterChange,
  onSelectOrder,
  onStartCreate,
}: WorkOrderListPanelProps) {
  const query = search.trim().toLowerCase();
  const filtered = orders.filter((order) => {
    if (filter === "open" && !isOpenStatus(order.status)) return false;
    if (filter === "done" && isOpenStatus(order.status)) return false;
    if (!query) return true;
    const haystack = [
      formatWorkOrderLabel(order, displayIndex),
      order.number,
      order.clientName,
      order.clientPhone,
      order.vehicleLabel,
      order.licensePlate,
      order.vin,
      workOrderAssigneeSummary(order, employees),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });

  const listKey = `${filter}-${query || "all"}`;

  return (
    <aside className="flex h-full w-[300px] shrink-0 flex-col border-r bg-muted/20">
      <div className="space-y-3 border-b bg-card/80 p-3 backdrop-blur-sm">
        {canEdit ? (
          <Button
            type="button"
            className="w-full justify-center gap-2"
            onClick={onStartCreate}
          >
            <Plus className="size-4" />
            Новый заказ-наряд
          </Button>
        ) : null}
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Поиск: клиент, номер, авто…"
            className="h-9 bg-background pl-8 text-sm"
          />
        </div>
        <LayoutGroup id="work-orders-filter">
          <div className="flex rounded-lg border bg-muted/40 p-0.5">
            {FILTER_OPTIONS.map((option) => {
              const active = filter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onFilterChange(option.value)}
                  className={cn(
                    "relative flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors duration-200",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {active ? (
                    <motion.span
                      layoutId="work-orders-filter-active"
                      className="absolute inset-0 rounded-md bg-background shadow-sm"
                      transition={workOrdersNavSpring}
                    />
                  ) : null}
                  <span className="relative z-10">{option.label}</span>
                </button>
              );
            })}
          </div>
        </LayoutGroup>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {isCreating ? (
          <div className="mb-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm animate-autocore-fade-in-up motion-reduce:animate-none">
            <p className="font-medium text-primary">Новый заказ</p>
            <p className="text-xs text-muted-foreground">Заполните форму справа</p>
          </div>
        ) : null}

        <AnimatePresence mode="wait" initial={false}>
          {filtered.length === 0 ? (
            <motion.p
              key={`empty-${listKey}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={workOrdersSectionTransition}
              className="px-2 py-8 text-center text-sm text-muted-foreground"
            >
              {orders.length === 0 ? userCopy.workOrders.emptyTitle : "Ничего не найдено"}
            </motion.p>
          ) : (
            <motion.ul
              key={listKey}
              className="space-y-1.5"
              variants={workOrdersListVariants}
              initial="hidden"
              animate="show"
              exit="exit"
            >
              {filtered.map((order) => {
                const selected = !isCreating && selectedOrderId === order.id;
                const assignees = workOrderAssigneeSummary(
                  order,
                  employees,
                  payrollByOrderId.get(order.id) ?? [],
                );
                return (
                  <motion.li key={order.id} variants={workOrdersListItemVariants} layout="position">
                    <button
                      type="button"
                      onClick={() => onSelectOrder(order.id)}
                      className={cn(
                        "w-full rounded-xl border px-3 py-2.5 text-left transition-all duration-200",
                        selected
                          ? "border-primary/40 bg-primary/5 shadow-sm"
                          : "border-transparent bg-card hover:border-border/80 hover:bg-card/90",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1 ps-0.5 pr-1">
                          <p className="line-clamp-1 text-sm font-semibold">
                            {formatWorkOrderLabel(order, displayIndex)}
                          </p>
                          <p className="line-clamp-1 ps-px text-xs text-muted-foreground">{order.clientName || "—"}</p>
                          {assignees ? (
                            <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground/80">
                              <UserRound className="mr-1 inline size-3 -translate-y-px" />
                              {assignees}
                            </p>
                          ) : null}
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                            statusTone(order.status),
                          )}
                        >
                          {STATUS_LABELS[order.status]}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                        <span className="line-clamp-1 min-w-0 flex-1 text-muted-foreground">
                          {order.licensePlate || order.vin || order.vehicleLabel || "—"}
                        </span>
                        <span className="shrink-0 font-medium tabular-nums">{money(order.pricing.grandTotal)}</span>
                      </div>
                    </button>
                  </motion.li>
                );
              })}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}
