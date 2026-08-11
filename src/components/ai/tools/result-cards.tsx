"use client";

import Link from "next/link";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";

import {
  ToolCardLines,
  ToolCardRow,
  ToolCardShell,
} from "@/components/ai/tools/tool-card-shell";
import { TOOL_ICONS } from "@/components/ai/tools/tool-icons";
import type {
  CreateAccountingOperationOutput,
  CreateClientOutput,
  CreateEngineIntakeJobOutput,
  CreateEngineOutput,
  CreateInventoryItemOutput,
  CreateWorkOrderOutput,
  EnsureWorkOrderDocumentsOutput,
  FindStockLocationOutput,
  GetFinanceSummaryOutput,
  GetWarehouseLocationOutput,
  GetWorkOrderOutput,
  ListCapabilitiesOutput,
  ListWorkOrdersOutput,
  NavigateToOutput,
  ReceiveStockOutput,
  RelocateStockOutput,
  SearchEnginesOutput,
  SearchInventoryOutput,
  SellEngineOutput,
  TransitionWorkOrderStatusOutput,
} from "@/domain/ai/tool-schemas";
import type { CoreToolName } from "@/domain/ai/tool-schemas";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

/** Narrow a tool result to its success branch. */
type Ok<T> = Extract<T, { ok: true }>;

const copy = userCopy.ai.tool;

function ActionCard({
  tool,
  title,
  subtitle,
  href,
}: {
  tool: CoreToolName;
  title: string;
  subtitle?: string;
  href?: string;
}) {
  return (
    <ToolCardShell icon={TOOL_ICONS[tool]} title={title} href={href}>
      {subtitle || href ? (
        <ToolCardRow href={href}>
          <ToolCardLines title={subtitle || copy.openInAutocore} />
        </ToolCardRow>
      ) : null}
    </ToolCardShell>
  );
}

function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    // Unknown currency codes must not crash a rendered answer.
    return `${Math.round(value).toLocaleString("en-US")} ${currency}`;
  }
}

function formatQuantity(value: number, unit?: string): string {
  const rounded = Number.isInteger(value) ? value : Math.round(value * 100) / 100;
  return unit ? `${rounded} ${unit}` : String(rounded);
}

/* ------------------------------------------------------------------ inventory */

export function StockCard({ data }: { data: Ok<SearchInventoryOutput> }) {
  return (
    <ToolCardShell
      icon={TOOL_ICONS.searchInventory}
      title={copy.searchInventory}
      meta={data.totalMatched > 0 ? `${data.totalMatched}` : undefined}
      href={data.href}
      notice={data.truncated ? copy.partialWindow : undefined}
      empty={data.items.length === 0}
    >
      {data.items.map((item) => (
        <ToolCardRow key={item.id} href={item.href}>
          <ToolCardLines
            title={item.name || item.sku}
            subtitle={[item.sku, item.brandName].filter(Boolean).join(" · ")}
          />
          <span className="shrink-0 text-right">
            <span
              className={cn(
                "block text-[13px] font-medium tabular-nums leading-tight",
                item.lowStock && "text-warning-on-subtle",
              )}
            >
              {formatQuantity(item.available, item.unit)}
            </span>
            {item.reserved > 0 ? (
              <span className="block text-[11px] leading-tight text-muted-foreground tabular-nums">
                {formatQuantity(item.onHand)} / −{formatQuantity(item.reserved)}
              </span>
            ) : null}
          </span>
        </ToolCardRow>
      ))}
    </ToolCardShell>
  );
}

export function StockLocationCard({ data }: { data: Ok<FindStockLocationOutput> }) {
  return (
    <ToolCardShell
      icon={TOOL_ICONS.findStockLocation}
      title={data.item.name || data.item.sku}
      meta={formatQuantity(data.item.available, data.item.unit)}
      href={data.item.href}
      empty={data.placements.length === 0}
    >
      {data.placements.map((placement) => (
        <ToolCardRow key={placement.locationId} href={placement.href}>
          <ToolCardLines title={placement.displayCode} subtitle={placement.warehouseId} />
          <span className="shrink-0 text-[13px] font-medium tabular-nums">
            {formatQuantity(placement.quantity)}
          </span>
        </ToolCardRow>
      ))}
    </ToolCardShell>
  );
}

/* ---------------------------------------------------------------- work orders */

export function WorkOrderListCard({ data }: { data: Ok<ListWorkOrdersOutput> }) {
  return (
    <ToolCardShell
      icon={TOOL_ICONS.listWorkOrders}
      title={copy.listWorkOrders}
      meta={data.totalMatched > 0 ? `${data.totalMatched}` : undefined}
      href={data.href}
      notice={data.scopeLimited ? copy.scopeLimited : undefined}
      empty={data.orders.length === 0}
    >
      {data.orders.map((order) => (
        <ToolCardRow key={order.id} href={order.href}>
          <ToolCardLines
            title={`#${order.number}${order.licensePlate ? ` · ${order.licensePlate}` : ""}`}
            subtitle={[order.clientName, order.vehicleLabel].filter(Boolean).join(" · ")}
          />
          <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[11px] leading-none text-muted-foreground">
            {order.statusLabel}
          </span>
        </ToolCardRow>
      ))}
    </ToolCardShell>
  );
}

export function WorkOrderDetailCard({ data }: { data: Ok<GetWorkOrderOutput> }) {
  const { order } = data;
  const hasLines = order.partLines.length > 0 || order.laborTitles.length > 0;

  return (
    <ToolCardShell
      icon={TOOL_ICONS.getWorkOrder}
      title={`#${order.number}`}
      meta={order.statusLabel}
      href={order.href}
    >
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 px-3 py-2 sm:grid-cols-3">
        <Field label="Client" value={order.clientName} />
        <Field label="Vehicle" value={order.vehicleLabel} />
        <Field label="Plate" value={order.licensePlate} />
        {order.vin ? <Field label="VIN" value={order.vin} /> : null}
        {order.mileage > 0 ? (
          <Field label="Mileage" value={order.mileage.toLocaleString("en-US")} />
        ) : null}
        <Field label="Total" value={order.grandTotal.toLocaleString("en-US")} />
      </div>

      {hasLines ? (
        <div className="border-t border-border/70">
          {order.partLines.map((line) => (
            <ToolCardRow key={line.id}>
              <ToolCardLines title={line.name} subtitle={line.sku} />
              <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">
                ×{line.quantity}
              </span>
            </ToolCardRow>
          ))}
          {order.laborTitles.map((title) => (
            <ToolCardRow key={title}>
              <ToolCardLines title={title} subtitle="Labor" />
            </ToolCardRow>
          ))}
        </div>
      ) : null}
    </ToolCardShell>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <span className="min-w-0">
      <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <span className="block truncate text-[13px] leading-tight">{value}</span>
    </span>
  );
}

/* -------------------------------------------------------------------- engines */

export function EngineCard({ data }: { data: Ok<SearchEnginesOutput> }) {
  return (
    <ToolCardShell
      icon={TOOL_ICONS.searchEngines}
      title={data.resolvedTerm ? `${copy.searchEngines} · ${data.resolvedTerm}` : copy.searchEngines}
      meta={data.totalMatched > 0 ? `${data.totalMatched}` : undefined}
      href={data.href}
      notice={data.truncated ? copy.partialWindow : undefined}
      empty={data.engines.length === 0}
    >
      {data.engines.map((engine) => (
        <ToolCardRow key={engine.id} href={engine.href}>
          <ToolCardLines
            title={[engine.brandName, engine.engineCode].filter(Boolean).join(" ") || engine.serialCode}
            subtitle={[engine.serialCode, engine.configuration, engine.locationCode]
              .filter(Boolean)
              .join(" · ")}
          />
          {engine.status ? (
            <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[11px] leading-none text-muted-foreground">
              {engine.status}
            </span>
          ) : null}
        </ToolCardRow>
      ))}
    </ToolCardShell>
  );
}

export function CreateEngineCard({ data }: { data: Ok<CreateEngineOutput> }) {
  const engine = data.engine;
  return (
    <ToolCardShell icon={TOOL_ICONS.createEngine} title={copy.engineAdded} href={data.href}>
      <ToolCardRow href={engine.href}>
        <ToolCardLines
          title={[engine.brandName, engine.engineCode].filter(Boolean).join(" ") || engine.serialCode}
          subtitle={[engine.serialCode, engine.status].filter(Boolean).join(" · ")}
        />
      </ToolCardRow>
    </ToolCardShell>
  );
}

export function SellEngineCard({ data }: { data: Ok<SellEngineOutput> }) {
  const engine = data.engine;
  return (
    <ToolCardShell icon={TOOL_ICONS.sellEngine} title={copy.engineSold} href={data.href}>
      <ToolCardRow href={engine.href}>
        <ToolCardLines
          title={[engine.brandName, engine.engineCode].filter(Boolean).join(" ") || engine.serialCode}
          subtitle={[engine.serialCode, engine.status].filter(Boolean).join(" · ")}
        />
      </ToolCardRow>
    </ToolCardShell>
  );
}

export function CapabilitiesCard({ data }: { data: Ok<ListCapabilitiesOutput> }) {
  return (
    <ToolCardShell
      icon={TOOL_ICONS.listCapabilities}
      title={copy.capabilitiesTitle}
      meta={`${data.tools.length}`}
    >
      {data.tools.map((entry) => (
        <ToolCardRow key={entry.name}>
          <ToolCardLines title={entry.name} subtitle={entry.purpose} />
        </ToolCardRow>
      ))}
    </ToolCardShell>
  );
}

export function CreateInventoryItemCard({ data }: { data: Ok<CreateInventoryItemOutput> }) {
  return (
    <ActionCard
      tool="createInventoryItem"
      title={copy.itemCreated}
      subtitle={[data.name, data.sku, data.barcode].filter(Boolean).join(" · ")}
      href={data.href}
    />
  );
}

export function ReceiveStockCard({ data }: { data: Ok<ReceiveStockOutput> }) {
  return (
    <ActionCard
      tool="receiveStock"
      title={copy.stockReceived}
      subtitle={`+${data.quantity} · on hand ${data.onHand}`}
      href={data.href}
    />
  );
}

export function RelocateStockCard({ data }: { data: Ok<RelocateStockOutput> }) {
  return (
    <ActionCard
      tool="relocateStock"
      title={copy.stockMoved}
      subtitle={`${data.quantity} → ${data.toLocationCode}`}
      href={data.href}
    />
  );
}

export function CreateWorkOrderCard({ data }: { data: Ok<CreateWorkOrderOutput> }) {
  return (
    <ActionCard
      tool="createWorkOrder"
      title={copy.workOrderCreated}
      subtitle={`#${data.order.number} · ${data.order.statusLabel}`}
      href={data.order.href}
    />
  );
}

export function TransitionWorkOrderCard({ data }: { data: Ok<TransitionWorkOrderStatusOutput> }) {
  return (
    <ActionCard
      tool="transitionWorkOrderStatus"
      title={copy.workOrderUpdated}
      subtitle={`#${data.order.number} · ${data.order.statusLabel}`}
      href={data.order.href}
    />
  );
}

export function EnsureDocumentsCard({ data }: { data: Ok<EnsureWorkOrderDocumentsOutput> }) {
  return (
    <ActionCard
      tool="ensureWorkOrderDocuments"
      title={copy.documentsQueued}
      subtitle={data.slugs.join(", ") || data.jobId || data.workOrderId}
      href={data.href}
    />
  );
}

export function CreateClientCard({ data }: { data: Ok<CreateClientOutput> }) {
  return (
    <ActionCard
      tool="createClient"
      title={copy.clientCreated}
      subtitle={[data.fullName, data.phone].filter(Boolean).join(" · ")}
      href={data.href}
    />
  );
}

export function IntakeJobCard({ data }: { data: Ok<CreateEngineIntakeJobOutput> }) {
  return (
    <ActionCard
      tool="createEngineIntakeJob"
      title={copy.intakeStarted}
      subtitle={data.jobId}
      href={data.href}
    />
  );
}

export function AccountingOperationCard({ data }: { data: Ok<CreateAccountingOperationOutput> }) {
  return (
    <ActionCard
      tool="createAccountingOperation"
      title={copy.operationPosted}
      subtitle={`${data.type} · ${data.amount}`}
      href={data.href}
    />
  );
}

/* -------------------------------------------------------------------- finance */

export function FinanceCard({ data }: { data: Ok<GetFinanceSummaryOutput> }) {
  const positive = data.net >= 0;
  const Trend = positive ? TrendingUp : TrendingDown;
  const peak = Math.max(...data.series.map((point) => Math.abs(point.value)), 1);

  return (
    <ToolCardShell
      icon={TOOL_ICONS.getFinanceSummary}
      title={`${copy.getFinanceSummary} · ${data.periodDays}d`}
      meta={`${data.operationCount}`}
      href={data.href}
      notice={data.truncated ? copy.partialWindow : undefined}
    >
      <div className="grid grid-cols-3 gap-2 px-3 py-2.5">
        <Metric label="Income" value={formatMoney(data.income, data.currency)} />
        <Metric label="Expense" value={formatMoney(data.expense, data.currency)} />
        <Metric
          label="Net"
          value={formatMoney(data.net, data.currency)}
          icon={<Trend className="size-3 shrink-0 opacity-70" aria-hidden />}
        />
      </div>

      {/* Sparkline: pure flexbox bars, so there is no chart runtime in the chat bundle. */}
      <div
        className="flex h-10 items-end gap-px px-3 pb-2.5"
        role="img"
        aria-label={`Daily net over ${data.periodDays} days`}
      >
        {data.series.map((point) => (
          <span
            key={point.date}
            title={`${point.date}: ${formatMoney(point.value, data.currency)}`}
            className={cn(
              "min-w-px flex-1 rounded-sm",
              point.value >= 0 ? "bg-primary/45" : "bg-danger/45",
            )}
            style={{ height: `${Math.max(4, (Math.abs(point.value) / peak) * 100)}%` }}
          />
        ))}
      </div>
    </ToolCardShell>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <span className="min-w-0">
      <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <span className="flex items-center gap-1 text-[15px] font-semibold leading-tight tabular-nums">
        <span className="truncate">{value}</span>
        {icon}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------- location */

export function LocationCard({ data }: { data: Ok<GetWarehouseLocationOutput> }) {
  const { location, occupancy } = data;

  return (
    <ToolCardShell
      icon={TOOL_ICONS.getWarehouseLocation}
      title={location.displayCode}
      meta={`${occupancy.lineCount}`}
      href={location.href}
      empty={data.items.length === 0}
    >
      <div className="grid grid-cols-3 gap-2 border-b border-border/70 px-3 py-2">
        <Metric label="On hand" value={String(occupancy.totalOnHand)} />
        <Metric label="Available" value={String(occupancy.totalAvailable)} />
        <Metric label="Engines" value={String(occupancy.engineCount)} />
      </div>
      {data.items.map((item) => (
        <ToolCardRow key={`${item.kind}-${item.id}`}>
          <ToolCardLines
            title={item.title}
            subtitle={[item.sku ?? item.serialCode, item.subtitle].filter(Boolean).join(" · ")}
          />
          <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">
            {formatQuantity(item.quantity)}
          </span>
        </ToolCardRow>
      ))}
    </ToolCardShell>
  );
}

/* ----------------------------------------------------------------- navigation */

export function NavigateCard({ data }: { data: Ok<NavigateToOutput> }) {
  return (
    <Link
      href={data.href}
      className={cn(
        "inline-flex min-h-11 max-w-full items-center gap-2 rounded-lg border border-border",
        "bg-secondary px-3 text-[13px] font-medium transition-colors hover:bg-muted sm:min-h-9",
      )}
    >
      <span className="min-w-0 truncate">{data.label}</span>
      {data.reason ? (
        <span className="hidden min-w-0 truncate text-muted-foreground md:inline">
          {data.reason}
        </span>
      ) : null}
      <ArrowRight className="size-3.5 shrink-0 opacity-60" aria-hidden />
    </Link>
  );
}
