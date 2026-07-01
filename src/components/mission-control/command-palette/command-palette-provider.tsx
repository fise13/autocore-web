"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Command } from "cmdk";
import {
  Download,
  Folder,
  LayoutGrid,
  Package,
  Plus,
  Receipt,
  Search,
  Settings,
  Upload,
  UserPlus,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";

import { useWorkspace } from "@/components/layout/workspace-context";
import { useBillingGate } from "@/components/billing/billing-gate-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useMissionControlData } from "@/hooks/use-mission-control-data";
import { useClientsRealtime } from "@/hooks/use-clients-realtime";
import { canAccessMotorsArea, canAccessMissionControl, canAccessPath, isNavAllowed } from "@/lib/auth/app-access";
import { can } from "@/lib/auth/permissions";
import { operationCategoryLabel, operationTypeLabel } from "@/lib/accounting/labels";
import { formatRole } from "@/lib/user-copy";
import { normalizeCompanyId } from "@/lib/company-id";
import { businessNavCopy } from "@/lib/navigation/business-nav-copy";
import { buildCollectionHref } from "@/lib/navigation/inventory-collections";
import { deepActionRoutes } from "@/lib/navigation/deep-actions";
import { buildWorkOrderDisplayIndex, formatWorkOrderLabel } from "@/lib/work-order/work-order-display";
import { createClientRepository } from "@/infrastructure/firestore/client-repository";

const clientRepository = createClientRepository();

function matchesQuery(query: string, parts: Array<string | undefined | null>): boolean {
  if (!query) return true;
  const haystack = parts.filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(query);
}

type CommandPaletteContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

export function useCommandPalette() {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error("useCommandPalette must be used within CommandPaletteProvider");
  }
  return context;
}

type CommandPaletteProviderProps = {
  children: ReactNode;
};

export function CommandPaletteProvider({ children }: CommandPaletteProviderProps) {
  const router = useRouter();
  const workspace = useWorkspace();
  const { profile } = useAuth();
  const { isPro } = useBillingGate();
  const companyId = normalizeCompanyId(profile?.companyId);
  const uid = profile?.id ?? "";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const data = useMissionControlData({ profile, uid, companyId, isPro, enabled: open });
  const { clients } = useClientsRealtime(
    clientRepository,
    companyId,
    open && Boolean(companyId) && can(profile, "work_orders_view"),
  );

  useEffect(() => {
    if (!open) return;
    const routes = ["/", "/motors", "/warehouse", "/work-orders", "/settings", "/quotes"];
    routes.forEach((href) => router.prefetch(href));
  }, [open, router]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router],
  );

  const normalizedQuery = query.trim().toLowerCase();
  const workOrderIndex = useMemo(
    () => buildWorkOrderDisplayIndex(data.workOrders),
    [data.workOrders],
  );

  const motorHits = useMemo(() => {
    if (!canAccessMotorsArea(profile)) return [];
    return data.motors
      .filter((motor) =>
        matchesQuery(normalizedQuery, [
          motor.serialCode,
          motor.brandName,
          motor.engineCode,
          motor.configuration,
          motor.notes,
        ]),
      )
      .slice(0, normalizedQuery ? 12 : 8);
  }, [data.motors, normalizedQuery, profile]);

  const workOrderHits = useMemo(() => {
    if (!can(profile, "work_orders_view")) return [];
    return data.workOrders
      .filter((order) =>
        matchesQuery(normalizedQuery, [
          order.number,
          order.id,
          formatWorkOrderLabel(order, workOrderIndex),
          order.clientName,
          order.vehicleLabel,
        ]),
      )
      .slice(0, normalizedQuery ? 12 : 6);
  }, [data.workOrders, normalizedQuery, profile, workOrderIndex]);

  const clientHits = useMemo(() => {
    if (!can(profile, "work_orders_view")) return [];
    return clients
      .filter((client) =>
        matchesQuery(normalizedQuery, [client.fullName, client.phone, client.email, client.notes]),
      )
      .slice(0, normalizedQuery ? 10 : 6);
  }, [clients, normalizedQuery, profile]);

  const warehouseHits = useMemo(() => {
    if (!isNavAllowed(profile, "warehouse")) return [];
    return data.warehouseItems
      .filter((item) =>
        matchesQuery(normalizedQuery, [
          item.sku,
          item.name,
          item.brandName,
          item.supplierName,
          ...item.barcodes,
        ]),
      )
      .slice(0, normalizedQuery ? 12 : 6);
  }, [data.warehouseItems, normalizedQuery, profile]);

  const operationHits = useMemo(() => {
    if (!can(profile, "accounting_view")) return [];
    return data.operations
      .filter((operation) =>
        matchesQuery(normalizedQuery, [
          operation.category,
          operation.description,
          operation.comment,
          operationCategoryLabel(operation.category),
          operationTypeLabel(operation.type),
          String(operation.amount),
        ]),
      )
      .slice(0, normalizedQuery ? 10 : 6);
  }, [data.operations, normalizedQuery, profile]);

  const employeeHits = useMemo(() => {
    if (!isPro || !can(profile, "employee_manage")) return [];
    return data.employees
      .filter((employee) =>
        matchesQuery(normalizedQuery, [employee.fullName, employee.email, formatRole(employee.role)]),
      )
      .slice(0, normalizedQuery ? 10 : 6);
  }, [data.employees, isPro, normalizedQuery, profile]);

  const showNavigation = !normalizedQuery;

  const toggle = useCallback(() => setOpen((current) => !current), []);

  return (
    <CommandPaletteContext.Provider value={{ open, setOpen, toggle }}>
      {children}
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setQuery("");
        }}
      >
        <DialogContent className="overflow-hidden p-0 sm:max-w-xl">
          <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground">
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 size-4 shrink-0 opacity-50" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Мотор, клиент, заказ-наряд, склад, раздел…"
                className="flex h-12 w-full bg-transparent py-3 text-sm outline-none"
              />
            </div>
            <Command.List className="max-h-80 overflow-auto p-2">
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                Ничего не найдено
              </Command.Empty>

              {showNavigation ? (
              <Command.Group heading="Бизнес">
                {canAccessMissionControl(profile) ? (
                  <CommandItem icon={LayoutGrid} onSelect={() => navigate("/")}>
                    {businessNavCopy.workspace.dashboard}
                  </CommandItem>
                ) : null}
                {canAccessMotorsArea(profile) ? (
                  <CommandItem
                    icon={LayoutGrid}
                    onSelect={() => navigate(buildCollectionHref({ collection: "engines" }))}
                  >
                    {businessNavCopy.inventoryCollection.engines}
                  </CommandItem>
                ) : null}
                {isNavAllowed(profile, "sold") ? (
                  <CommandItem icon={Receipt} onSelect={() => navigate("/sold")}>
                    {businessNavCopy.business.sales}
                  </CommandItem>
                ) : null}
                {can(profile, "work_orders_view") ? (
                  <CommandItem icon={Package} onSelect={() => navigate("/work-orders")}>
                    {businessNavCopy.business.workOrders}
                  </CommandItem>
                ) : null}
                {can(profile, "accounting_view") ? (
                  <CommandItem icon={Folder} onSelect={() => navigate("/accounting")}>
                    {businessNavCopy.business.accounting}
                  </CommandItem>
                ) : null}
                {isNavAllowed(profile, "warehouse") ? (
                  <CommandItem
                    icon={Package}
                    onSelect={() => navigate(buildCollectionHref({ collection: "consumables" }))}
                  >
                    {businessNavCopy.inventoryCollection.consumables}
                  </CommandItem>
                ) : null}
                {canAccessPath(profile, "/settings") ? (
                  <CommandItem icon={Settings} onSelect={() => navigate("/settings")}>
                    Настройки
                  </CommandItem>
                ) : null}
              </Command.Group>
              ) : null}

              {showNavigation && canAccessMotorsArea(profile) && can(profile, "inventory_edit") ? (
                <Command.Group heading={businessNavCopy.quickActions.section}>
                  <CommandItem icon={Plus} onSelect={() => navigate(deepActionRoutes.add())}>
                    {businessNavCopy.quickActions.addEngine}
                  </CommandItem>
                  <CommandItem icon={Upload} onSelect={() => navigate(deepActionRoutes.import())}>
                    {businessNavCopy.quickActions.importBusiness}
                  </CommandItem>
                  <CommandItem icon={Download} onSelect={() => navigate(deepActionRoutes.export())}>
                    Экспорт Excel
                  </CommandItem>
                  <CommandItem icon={Receipt} onSelect={() => navigate(deepActionRoutes.sell())}>
                    {businessNavCopy.quickActions.sellItem}
                  </CommandItem>
                </Command.Group>
              ) : null}

              {showNavigation && can(profile, "accounting_edit") ? (
                <Command.Group heading="Бухгалтерия">
                  <CommandItem icon={Wallet} onSelect={() => navigate(deepActionRoutes.expense())}>
                    Добавить расход
                  </CommandItem>
                </Command.Group>
              ) : null}

              {showNavigation && isPro && can(profile, "employee_manage") ? (
                <Command.Group heading="Команда">
                  <CommandItem icon={UserPlus} onSelect={() => navigate(deepActionRoutes.invite())}>
                    Пригласить сотрудника
                  </CommandItem>
                </Command.Group>
              ) : null}

              {motorHits.length > 0 ? (
                <Command.Group heading="Моторы">
                  {motorHits.map((motor) => (
                    <CommandItem
                      key={motor.id}
                      icon={LayoutGrid}
                      onSelect={() =>
                        navigate(`/motors?search=${encodeURIComponent(motor.serialCode || motor.id)}`)
                      }
                    >
                      {`${motor.serialCode || "—"} · ${motor.brandName ?? ""} ${motor.engineCode ?? ""}`.trim()}
                    </CommandItem>
                  ))}
                </Command.Group>
              ) : null}

              {workOrderHits.length > 0 ? (
                <Command.Group heading="Заказ-наряды">
                  {workOrderHits.map((order) => (
                    <CommandItem
                      key={order.id}
                      icon={Wrench}
                      onSelect={() => navigate(`/work-orders?order=${encodeURIComponent(order.id)}`)}
                    >
                      {formatWorkOrderLabel(order, workOrderIndex)}
                      {order.clientName ? ` · ${order.clientName}` : ""}
                    </CommandItem>
                  ))}
                </Command.Group>
              ) : null}

              {clientHits.length > 0 ? (
                <Command.Group heading="Клиенты">
                  {clientHits.map((client) => (
                    <CommandItem
                      key={client.id}
                      icon={Users}
                      onSelect={() =>
                        navigate(`/work-orders?section=clients&search=${encodeURIComponent(client.fullName)}`)
                      }
                    >
                      {client.fullName}
                      {client.phone ? ` · ${client.phone}` : ""}
                    </CommandItem>
                  ))}
                </Command.Group>
              ) : null}

              {warehouseHits.length > 0 ? (
                <Command.Group heading="Склад">
                  {warehouseHits.map((item) => (
                    <CommandItem
                      key={item.id}
                      icon={Package}
                      onSelect={() =>
                        navigate(`/warehouse?search=${encodeURIComponent(item.sku || item.name)}`)
                      }
                    >
                      {item.sku ? `${item.sku} · ` : ""}
                      {item.name}
                    </CommandItem>
                  ))}
                </Command.Group>
              ) : null}

              {operationHits.length > 0 ? (
                <Command.Group heading="Операции">
                  {operationHits.map((operation) => (
                    <CommandItem key={operation.id} icon={Folder} onSelect={() => navigate("/accounting")}>
                      {`${operation.category ? operationCategoryLabel(operation.category) : operationTypeLabel(operation.type)} · ${operation.amount.toLocaleString("ru-RU")} ₸`}
                    </CommandItem>
                  ))}
                </Command.Group>
              ) : null}

              {employeeHits.length > 0 ? (
                <Command.Group heading="Сотрудники">
                  {employeeHits.map((employee) => (
                    <CommandItem
                      key={employee.uid}
                      icon={UserPlus}
                      onSelect={() => navigate("/settings?section=company")}
                    >
                      {`${employee.fullName || employee.email.split("@")[0]} · ${formatRole(employee.role)}`}
                    </CommandItem>
                  ))}
                </Command.Group>
              ) : null}
            </Command.List>
          </Command>
        </DialogContent>
      </Dialog>
    </CommandPaletteContext.Provider>
  );
}

function CommandItem({
  children,
  onSelect,
  icon: Icon,
}: {
  children: React.ReactNode;
  onSelect: () => void;
  icon: typeof Search;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-muted"
    >
      <Icon className="size-4 opacity-60" />
      {children}
    </Command.Item>
  );
}
