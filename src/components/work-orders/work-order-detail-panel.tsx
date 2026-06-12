"use client";

import { useEffect, useState } from "react";
import {
  Banknote,
  Car,
  ChevronDown,
  FileText,
  History,
  Phone,
  User,
  UserRound,
} from "lucide-react";

import { WorkOrder, WorkOrderStatus } from "@/domain/work-order";
import { DomainEvent } from "@/domain/domain-event";
import { WorkOrderDocument } from "@/domain/work-order";
import { FinancialOperation } from "@/domain/financial-operation";
import { PayrollTransaction } from "@/domain/payroll-transaction";
import { CompanyEmployee } from "@/domain/rbac";
import { WorkOrderFinancePanel } from "@/components/work-orders/work-order-finance-panel";
import { WorkOrderDocumentsPanel } from "@/components/work-orders/work-order-documents-panel";
import { AnimatedTabsPanel } from "@/components/ui/animated-tabs-panel";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";
import { formatMotorLineLabel } from "@/lib/motors/format-motor-display-name";
import { formatWorkOrderLabel, workOrderAssigneeSummary } from "@/lib/work-order/work-order-display";
import {
  eventTypeLabel,
  STATUS_HINTS,
  STATUS_LABELS,
  statusTone,
  transitionLabel,
} from "@/components/work-orders/work-order-copy";
import { laborLineLabel, money } from "@/components/work-orders/work-order-utils";

type WorkOrderDetailPanelProps = {
  order: WorkOrder;
  displayIndex: Map<string, number>;
  events: DomainEvent[];
  documents: WorkOrderDocument[];
  operations: FinancialOperation[];
  payroll: PayrollTransaction[];
  employees: CompanyEmployee[];
  saving: boolean;
  canEdit: boolean;
  nextStatuses: WorkOrderStatus[];
  onTransition: (status: WorkOrderStatus) => void;
  onEdit?: () => void;
  preferredTab?: DetailTab;
};

type DetailTab = "lines" | "finance" | "documents";

export function WorkOrderDetailPanel({
  order,
  displayIndex,
  events,
  documents,
  operations,
  payroll,
  employees,
  saving,
  canEdit,
  nextStatuses,
  onTransition,
  onEdit,
  preferredTab,
}: WorkOrderDetailPanelProps) {
  const [showSystemLog, setShowSystemLog] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>(preferredTab ?? "lines");
  const [tabEpoch, setTabEpoch] = useState(0);
  const assignees = workOrderAssigneeSummary(order, employees, payroll);

  useEffect(() => {
    setActiveTab(preferredTab ?? "lines");
    setTabEpoch((current) => current + 1);
  }, [order.id, preferredTab]);

  function onTabChange(value: string) {
    setActiveTab(value as DetailTab);
    setTabEpoch((current) => current + 1);
  }

  return (
    <div className="flex h-full min-h-0 flex-col animate-autocore-page-enter motion-reduce:animate-none">
      <header className="border-b bg-card/60 px-6 py-5 backdrop-blur-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">{formatWorkOrderLabel(order, displayIndex)}</h2>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
                  statusTone(order.status),
                )}
              >
                {STATUS_LABELS[order.status]}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{STATUS_HINTS[order.status]}</p>
            {assignees ? (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <UserRound className="size-3.5 shrink-0" />
                <span className="font-medium text-foreground">Исполнители:</span> {assignees}
              </p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold tabular-nums">{money(order.pricing.grandTotal)}</p>
            <p className="text-xs text-muted-foreground">
              {order.laborLines.length} работ · {order.partLines.length} запч. · {order.motorLines.length} двиг.
            </p>
          </div>
        </div>

        {canEdit && (onEdit || nextStatuses.length > 0) ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {onEdit ? (
              <Button type="button" variant="outline" size="sm" disabled={saving} onClick={onEdit}>
                Редактировать
              </Button>
            ) : null}
            {nextStatuses.map((status, index) => (
              <Button
                key={status}
                type="button"
                variant={index === 0 ? "default" : "outline"}
                size="sm"
                disabled={saving}
                onClick={() => onTransition(status)}
              >
                {transitionLabel(order.status, status)}
              </Button>
            ))}
          </div>
        ) : null}
      </header>

      <div className="grid shrink-0 gap-3 border-b bg-muted/10 px-6 py-4 sm:grid-cols-2">
        <InfoTile icon={User} label="Клиент" value={order.clientName ?? "—"} hint={order.clientPhone} />
        <InfoTile
          icon={Car}
          label="Автомобиль"
          value={order.vehicleLabel ?? ([order.licensePlate, order.vin].filter(Boolean).join(" · ") || "—")}
          hint={order.mileage ? `${order.mileage.toLocaleString("ru-RU")} км` : undefined}
        />
      </div>

      {order.comment ? (
        <div className="border-b px-6 py-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Комментарий: </span>
          {order.comment}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        <Tabs value={activeTab} onValueChange={onTabChange}>
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="lines" className="transition-all duration-200">
              Состав заказа
            </TabsTrigger>
            <TabsTrigger value="finance" className="gap-1.5 transition-all duration-200">
              <Banknote className="size-3.5" />
              Бухгалтерия
              {operations.length > 0 ? (
                <span className="rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">
                  {operations.length}
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5 transition-all duration-200">
              <FileText className="size-3.5" />
              Документы
              {documents.length > 0 ? (
                <span className="rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">
                  {documents.length}
                </span>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lines" className="mt-0">
            <AnimatedTabsPanel active={activeTab === "lines"} epoch={tabEpoch} className="space-y-4">
              <LineGroup
                title="Работы"
                total={order.pricing.laborTotal}
                empty="Работы не указаны"
                lines={order.laborLines.map((line) => laborLineLabel(line, employees))}
              />
              <LineGroup
                title="Запчасти"
                total={order.pricing.partsTotal}
                empty="Запчасти не указаны"
                lines={order.partLines.map((line) => {
                  const tag = line.source === "adhoc" || !line.itemId ? " · разово" : "";
                  return `${line.name}${tag} × ${line.quantity} = ${money(line.quantity * line.unitPrice)}`;
                })}
              />
              <LineGroup
                title="Двигатели"
                total={order.pricing.motorsTotal}
                empty="Двигатели не указаны"
                lines={order.motorLines.map(
                  (line) =>
                    `${formatMotorLineLabel(line, { includeSerial: true })} · ${line.outcome === "install" ? "установка" : "продажа"} · ${money(line.unitPrice)}`,
                )}
              />
              {order.pricing.discount > 0 ? (
                <p className="text-sm text-muted-foreground">Скидка: {money(order.pricing.discount)}</p>
              ) : null}
            </AnimatedTabsPanel>
          </TabsContent>

          <TabsContent value="finance" className="mt-0">
            <AnimatedTabsPanel active={activeTab === "finance"} epoch={tabEpoch}>
              <WorkOrderFinancePanel
                order={order}
                operations={operations}
                payroll={payroll}
                employees={employees}
              />
            </AnimatedTabsPanel>
          </TabsContent>

          <TabsContent value="documents" className="mt-0">
            <AnimatedTabsPanel active={activeTab === "documents"} epoch={tabEpoch}>
              <WorkOrderDocumentsPanel
                companyId={order.companyId}
                orderId={order.id}
                order={order}
                documents={documents}
                canEdit={canEdit}
              />
            </AnimatedTabsPanel>
          </TabsContent>
        </Tabs>

        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowSystemLog((current) => !current)}
            className="flex w-full items-center justify-between rounded-lg border bg-muted/20 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/40"
          >
            <span className="flex items-center gap-2">
              <History className="size-3.5" />
              Системная история ({events.length})
            </span>
            <ChevronDown className={cn("size-4 transition-transform duration-200", showSystemLog && "rotate-180")} />
          </button>
          {showSystemLog ? (
            <ul className="mt-2 space-y-1 rounded-lg border bg-card p-2 animate-autocore-fade-in-up motion-reduce:animate-none">
              {events.length === 0 ? (
                <li className="px-2 py-3 text-xs text-muted-foreground">Событий пока нет</li>
              ) : (
                events.slice(0, 12).map((event) => (
                  <li
                    key={event.id}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-xs"
                  >
                    <span>{eventTypeLabel(event.type)}</span>
                    <span
                      className={cn(
                        event.status === "failed" ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {event.status === "pending"
                        ? "ожидание"
                        : event.status === "processed"
                          ? "готово"
                          : event.status}
                    </span>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function WorkOrderEmptyPanel({ canEdit, onCreateNew }: { canEdit: boolean; onCreateNew: () => void }) {
  return (
    <div className="flex h-full items-center justify-center px-6 py-10">
      <EmptyState
        icon={FileText}
        title={userCopy.workOrders.emptyTitle}
        description={userCopy.workOrders.emptyDescription}
        primaryAction={
          canEdit
            ? {
                label: userCopy.workOrders.emptyCreate,
                onClick: onCreateNew,
              }
            : undefined
        }
        className="max-w-lg"
      />
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof User;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border bg-card p-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="line-clamp-2 font-medium">{value}</p>
        {hint ? (
          <p className="mt-0.5 flex items-center gap-1 line-clamp-1 text-xs text-muted-foreground">
            {label === "Клиент" ? <Phone className="size-3 shrink-0" /> : null}
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function LineGroup({
  title,
  total,
  empty,
  lines,
}: {
  title: string;
  total: number;
  empty: string;
  lines: string[];
}) {
  return (
    <section className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <h3 className="text-sm font-medium">{title}</h3>
        <span className="text-sm font-semibold tabular-nums">{money(total)}</span>
      </div>
      {lines.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y">
          {lines.map((line, index) => (
            <li key={`${line}-${index}`} className="px-4 py-2.5 text-sm">
              {line}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
