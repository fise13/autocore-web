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

import { WorkOrder, WorkOrderAssigneeRole, WorkOrderStatus } from "@/domain/work-order";
import { DomainEvent } from "@/domain/domain-event";
import { WorkOrderDocument } from "@/domain/work-order";
import { FinancialOperation } from "@/domain/financial-operation";
import { PayrollTransaction } from "@/domain/payroll-transaction";
import { CompanyEmployee } from "@/domain/rbac";
import { WorkOrderClaimBanner } from "@/components/work-orders/work-order-claim-banner";
import {
  WorkOrderFinancePanel,
  type WorkOrderFinancePanelLabels,
} from "@/components/work-orders/work-order-finance-panel";
import {
  WorkOrderDocumentsPanel,
  type WorkOrderDocumentsPanelLabels,
} from "@/components/work-orders/work-order-documents-panel";
import { AnimatedTabsPanel } from "@/components/ui/animated-tabs-panel";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getActiveUserCopyLocale, userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";
import { formatMotorLineLabel } from "@/lib/motors/format-motor-display-name";
import {
  formatWorkOrderLabel,
  laborLineAssigneeLabels,
  workOrderAssigneeSummary,
  workOrderDisplayNumber,
} from "@/lib/work-order/work-order-display";
import {
  eventTypeLabel,
  STATUS_HINTS,
  STATUS_LABELS,
  transitionLabel,
} from "@/components/work-orders/work-order-copy";
import { money } from "@/components/work-orders/work-order-utils";
import type { DocumentSlug } from "@/lib/documents/document-types";
import { laborLineTotal, normalizeLaborPricingMode } from "@/lib/work-order/labor-pricing";
import { StatusBadge } from "@/components/ui/status-badge";
import { workOrderStatusStyle } from "@/lib/status/status-tones";

export type WorkOrderDetailPanelLabels = {
  dateLocale: "en" | "ru";
  orderTitle: (number: number) => string;
  assignees: string;
  lineSummary: (labor: number, parts: number, motors: number) => string;
  edit: string;
  client: string;
  vehicle: string;
  km: (n: string) => string;
  comment: string;
  tabLines: string;
  tabFinance: string;
  tabDocuments: string;
  laborTitle: string;
  partsTitle: string;
  motorsTitle: string;
  laborEmpty: string;
  partsEmpty: string;
  motorsEmpty: string;
  adhocTag: string;
  install: string;
  sale: string;
  discount: (amount: string) => string;
  systemHistory: (count: number) => string;
  noEvents: string;
  eventPending: string;
  eventReady: string;
  noAssignee: string;
  hoursAt: (hours: number, price: string, total: string) => string;
  fixedPrice: (total: string) => string;
  roleLabels: Record<WorkOrderAssigneeRole, string>;
  status: Record<WorkOrderStatus, string>;
  statusHint: Record<WorkOrderStatus, string>;
  documents: WorkOrderDocumentsPanelLabels;
  finance: WorkOrderFinancePanelLabels;
};

function getDefaultDetailLabels(): WorkOrderDetailPanelLabels {
  const locale = getActiveUserCopyLocale();
  const d = userCopy.workOrders.detail;
  return {
    dateLocale: locale,
    orderTitle: d.orderTitle,
    assignees: d.assignees,
    lineSummary: d.lineSummary,
    edit: d.edit,
    client: d.client,
    vehicle: d.vehicle,
    km: d.km,
    comment: d.comment,
    tabLines: d.tabLines,
    tabFinance: d.tabFinance,
    tabDocuments: d.tabDocuments,
    laborTitle: d.laborTitle,
    partsTitle: d.partsTitle,
    motorsTitle: d.motorsTitle,
    laborEmpty: d.laborEmpty,
    partsEmpty: d.partsEmpty,
    motorsEmpty: d.motorsEmpty,
    adhocTag: d.adhocTag,
    install: d.install,
    sale: d.sale,
    discount: d.discount,
    systemHistory: d.systemHistory,
    noEvents: d.noEvents,
    eventPending: d.eventPending,
    eventReady: d.eventReady,
    noAssignee: d.noAssignee,
    hoursAt: d.hoursAt,
    fixedPrice: (total) => total,
    roleLabels: { ...userCopy.workOrders.roles },
    status: { ...STATUS_LABELS },
    statusHint: { ...STATUS_HINTS },
    documents: {
      dateLocale: locale,
      autoHint: d.documents.autoHint,
      refresh: d.documents.refresh,
      generating: d.documents.generating,
      pdfGenerating: d.documents.pdfGenerating,
      noneForStatus: d.documents.noneForStatus,
      pending: d.documents.pending,
      ready: d.documents.ready,
      preview: d.documents.preview,
      openPdfFailed: d.documents.openPdfFailed,
      downloadPdfFailed: d.documents.downloadPdfFailed,
      refreshFailed: d.documents.refreshFailed,
      savedCount: d.documents.savedCount,
      updated: d.documents.updated,
    },
    finance: {
      notReady: d.finance.notReady,
      income: d.finance.income,
      expenses: d.finance.expenses,
      payroll: d.finance.payroll,
      operationsTitle: d.finance.operationsTitle,
      openAccounting: d.finance.openAccounting,
      opsProcessing: d.finance.opsProcessing,
      opsAfterComplete: d.finance.opsAfterComplete,
      payrollTitle: d.finance.payrollTitle,
      payrollEmpty: d.finance.payrollEmpty,
    },
  };
}

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
  /** Marketing demo: local document preview / print without API. */
  documentsDemoMode?: boolean;
  onDemoDocumentPreview?: (slug: DocumentSlug) => void;
  onDemoDocumentDownload?: (slug: DocumentSlug) => void | Promise<void>;
  labels?: WorkOrderDetailPanelLabels;
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
  documentsDemoMode = false,
  onDemoDocumentPreview,
  onDemoDocumentDownload,
  labels: labelsProp,
}: WorkOrderDetailPanelProps) {
  const labels = labelsProp ?? getDefaultDetailLabels();
  const [showSystemLog, setShowSystemLog] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>(preferredTab ?? "lines");
  const [tabEpoch, setTabEpoch] = useState(0);
  const assignees = workOrderAssigneeSummary(order, employees, payroll);
  const mileageLocale = labels.dateLocale === "en" ? "en-US" : "ru-RU";

  useEffect(() => {
    setActiveTab(preferredTab ?? "lines");
    setTabEpoch((current) => current + 1);
  }, [order.id, preferredTab]);

  function onTabChange(value: string) {
    setActiveTab(value as DetailTab);
    setTabEpoch((current) => current + 1);
  }

  const orderNumber = workOrderDisplayNumber(order, displayIndex);
  const orderTitle =
    orderNumber > 0 ? labels.orderTitle(orderNumber) : formatWorkOrderLabel(order, displayIndex);

  return (
    <div className="flex h-full min-h-0 flex-col animate-autocore-page-enter motion-reduce:animate-none">
      <header className="border-b bg-card/60 px-6 py-5 backdrop-blur-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">{orderTitle}</h2>
              <StatusBadge
                status={workOrderStatusStyle[order.status]}
                label={labels.status[order.status]}
                showIcon
              />
            </div>
            <p className="text-sm text-muted-foreground">{labels.statusHint[order.status]}</p>
            {assignees ? (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <UserRound className="size-3.5 shrink-0" />
                <span className="font-medium text-foreground">{labels.assignees}</span> {assignees}
              </p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold tabular-nums">{money(order.pricing.grandTotal)}</p>
            <p className="text-xs text-muted-foreground">
              {labels.lineSummary(
                order.laborLines.length,
                order.partLines.length,
                order.motorLines.length,
              )}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <WorkOrderClaimBanner order={order} />
        </div>

        {canEdit && (onEdit || nextStatuses.length > 0) ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {onEdit ? (
              <Button type="button" variant="outline" size="sm" disabled={saving} onClick={onEdit}>
                {labels.edit}
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
        <InfoTile
          icon={User}
          label={labels.client}
          value={order.clientName ?? "—"}
          hint={order.clientPhone}
          showPhoneIcon
        />
        <InfoTile
          icon={Car}
          label={labels.vehicle}
          value={order.vehicleLabel ?? ([order.licensePlate, order.vin].filter(Boolean).join(" · ") || "—")}
          hint={
            order.mileage
              ? labels.km(order.mileage.toLocaleString(mileageLocale))
              : undefined
          }
        />
      </div>

      {order.comment ? (
        <div className="border-b px-6 py-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{labels.comment} </span>
          {order.comment}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        <Tabs value={activeTab} onValueChange={onTabChange}>
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="lines" className="transition-all duration-200">
              {labels.tabLines}
            </TabsTrigger>
            <TabsTrigger value="finance" className="gap-1.5 transition-all duration-200">
              <Banknote className="size-3.5" />
              {labels.tabFinance}
              {operations.length > 0 ? (
                <span className="rounded-full bg-primary/10 px-1.5 text-micro text-primary">
                  {operations.length}
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5 transition-all duration-200">
              <FileText className="size-3.5" />
              {labels.tabDocuments}
              {documents.length > 0 ? (
                <span className="rounded-full bg-primary/10 px-1.5 text-micro text-primary">
                  {documents.length}
                </span>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lines" className="mt-0">
            <AnimatedTabsPanel active={activeTab === "lines"} epoch={tabEpoch} className="space-y-4">
              <LineGroup
                title={labels.laborTitle}
                total={order.pricing.laborTotal}
                empty={labels.laborEmpty}
                lines={order.laborLines.map((line) => formatLaborLine(line, employees, labels))}
              />
              <LineGroup
                title={labels.partsTitle}
                total={order.pricing.partsTotal}
                empty={labels.partsEmpty}
                lines={order.partLines.map((line) => {
                  const tag = line.source === "adhoc" || !line.itemId ? labels.adhocTag : "";
                  return `${line.name}${tag} × ${line.quantity} = ${money(line.quantity * line.unitPrice)}`;
                })}
              />
              <LineGroup
                title={labels.motorsTitle}
                total={order.pricing.motorsTotal}
                empty={labels.motorsEmpty}
                lines={order.motorLines.map(
                  (line) =>
                    `${formatMotorLineLabel(line, { includeSerial: true })} · ${
                      line.outcome === "install" ? labels.install : labels.sale
                    } · ${money(line.unitPrice)}`,
                )}
              />
              {order.pricing.discount > 0 ? (
                <p className="text-sm text-muted-foreground">
                  {labels.discount(money(order.pricing.discount))}
                </p>
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
                labels={labels.finance}
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
                demoMode={documentsDemoMode}
                onDemoPreview={onDemoDocumentPreview}
                onDemoDownload={onDemoDocumentDownload}
                labels={labels.documents}
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
              {labels.systemHistory(events.length)}
            </span>
            <ChevronDown className={cn("size-4 transition-transform duration-200", showSystemLog && "rotate-180")} />
          </button>
          {showSystemLog ? (
            <ul className="mt-2 space-y-1 rounded-lg border bg-card p-2 animate-autocore-fade-in-up motion-reduce:animate-none">
              {events.length === 0 ? (
                <li className="px-2 py-3 text-xs text-muted-foreground">{labels.noEvents}</li>
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
                        ? labels.eventPending
                        : event.status === "processed"
                          ? labels.eventReady
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

function formatLaborLine(
  line: WorkOrder["laborLines"][number],
  employees: CompanyEmployee[],
  labels: WorkOrderDetailPanelLabels,
) {
  const assigneeNames = laborLineAssigneeLabels(line, employees);
  const assignee = assigneeNames.length > 0 ? assigneeNames.join(", ") : labels.noAssignee;
  const total = laborLineTotal(line);
  const mode = normalizeLaborPricingMode(line.pricingMode);
  const pricePart =
    mode === "fixed"
      ? labels.fixedPrice(money(total))
      : labels.hoursAt(line.hours, money(line.unitPrice), money(total));
  return `${line.title} · ${pricePart} · ${assignee} (${labels.roleLabels[line.assigneeRole]})`;
}

function InfoTile({
  icon: Icon,
  label,
  value,
  hint,
  showPhoneIcon = false,
}: {
  icon: typeof User;
  label: string;
  value: string;
  hint?: string;
  showPhoneIcon?: boolean;
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
            {showPhoneIcon ? <Phone className="size-3 shrink-0" /> : null}
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
