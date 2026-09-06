"use client";

import { getToolName, isToolUIPart } from "ai";
import type { ReactNode } from "react";

import { ToolActivity, ToolError } from "@/components/ai/tools/tool-activity";
import { ShowGuideCard } from "@/components/guides/show-guide-card";
import {
  AccountingOperationCard,
  CapabilitiesCard,
  ClientsCard,
  CreateClientCard,
  CreateEngineCard,
  CreateInventoryItemCard,
  CreateWorkOrderCard,
  EngineCard,
  EnsureDocumentsCard,
  FinanceCard,
  ForgetFactCard,
  IntakeJobCard,
  LocationCard,
  NavigateCard,
  RecallKnowledgeCard,
  ReceiveStockCard,
  RelocateStockCard,
  RememberFactCard,
  SellEngineCard,
  ShiftBriefingCard,
  StockCard,
  StockLocationCard,
  TransitionWorkOrderCard,
  WorkOrderDetailCard,
  WorkOrderListCard,
} from "@/components/ai/tools/result-cards";
import type { CoreUIPart } from "@/domain/ai/core-message";
import { CORE_TOOL_NAMES, type CoreToolName } from "@/domain/ai/tool-schemas";
import { userCopy } from "@/lib/user-copy";

function isCoreToolName(value: string): value is CoreToolName {
  return (CORE_TOOL_NAMES as string[]).includes(value);
}

/**
 * Short argument echo shown while a tool runs — "Searching engines · bmw n54".
 *
 * Reads whichever field the tool takes; during `input-streaming` the input is
 * a partial object, so every access has to tolerate `undefined`.
 */
function activityDetail(input: unknown): string | undefined {
  if (!input || typeof input !== "object") return undefined;
  const record = input as Record<string, unknown>;
  for (const key of [
    "query",
    "sku",
    "locationId",
    "workOrderId",
    "sourceWorkOrderId",
    "label",
    "guideId",
    "status",
    "serialCode",
    "engineCode",
    "brandName",
    "name",
    "barcode",
    "clientName",
    "fullName",
    "itemId",
    "motorId",
    "memoryId",
    "engineCode",
    "toLocationCode",
    "type",
  ]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  if (typeof record.periodDays === "number") return `${record.periodDays}d`;
  if (typeof record.quantity === "number") return String(record.quantity);
  if (typeof record.amount === "number") return String(record.amount);
  return undefined;
}

/**
 * Render one `tool-*` message part.
 */
export function ToolPartRenderer({ part, live = true }: { part: CoreUIPart; live?: boolean }) {
  if (!isToolUIPart(part)) return null;

  const name = getToolName(part);
  const toolName: CoreToolName | "generic" = isCoreToolName(name) ? name : "generic";

  if (part.state === "input-streaming" || part.state === "input-available") {
    if (!live) return null;
    return <ToolActivity tool={toolName} detail={activityDetail(part.input)} />;
  }

  if (part.state === "output-error") {
    return <ToolError reason={part.errorText} />;
  }

  if (part.state !== "output-available") return null;

  switch (part.type) {
    case "tool-listCapabilities":
      return renderOk(part.output, (data) => <CapabilitiesCard data={data} />);
    case "tool-searchInventory":
      return renderOk(part.output, (data) => <StockCard data={data} />);
    case "tool-findStockLocation":
      return renderOk(part.output, (data) => <StockLocationCard data={data} />);
    case "tool-createInventoryItem":
      return renderOk(part.output, (data) => <CreateInventoryItemCard data={data} />);
    case "tool-receiveStock":
      return renderOk(part.output, (data) => <ReceiveStockCard data={data} />);
    case "tool-relocateStock":
      return renderOk(part.output, (data) => <RelocateStockCard data={data} />);
    case "tool-listWorkOrders":
      return renderOk(part.output, (data) => <WorkOrderListCard data={data} />);
    case "tool-getWorkOrder":
      return renderOk(part.output, (data) => <WorkOrderDetailCard data={data} />);
    case "tool-createWorkOrder":
      return renderOk(part.output, (data) => <CreateWorkOrderCard data={data} />);
    case "tool-transitionWorkOrderStatus":
      return renderOk(part.output, (data) => <TransitionWorkOrderCard data={data} />);
    case "tool-ensureWorkOrderDocuments":
      return renderOk(part.output, (data) => <EnsureDocumentsCard data={data} />);
    case "tool-createClient":
      return renderOk(part.output, (data) => <CreateClientCard data={data} />);
    case "tool-searchClients":
      return renderOk(part.output, (data) => <ClientsCard data={data} />);
    case "tool-searchEngines":
      return renderOk(part.output, (data) => <EngineCard data={data} />);
    case "tool-createEngine":
      return renderOk(part.output, (data) => <CreateEngineCard data={data} />);
    case "tool-sellEngine":
      return renderOk(part.output, (data) => <SellEngineCard data={data} />);
    case "tool-createEngineIntakeJob":
      return renderOk(part.output, (data) => <IntakeJobCard data={data} />);
    case "tool-getFinanceSummary":
      return renderOk(part.output, (data) => <FinanceCard data={data} />);
    case "tool-createAccountingOperation":
      return renderOk(part.output, (data) => <AccountingOperationCard data={data} />);
    case "tool-getWarehouseLocation":
      return renderOk(part.output, (data) => <LocationCard data={data} />);
    case "tool-navigateTo":
      return renderOk(part.output, (data) => <NavigateCard data={data} />);
    case "tool-showGuide":
      return renderOk(part.output, (data) => <ShowGuideCard data={data} />);
    case "tool-getShiftBriefing":
      return renderOk(part.output, (data) => <ShiftBriefingCard data={data} />);
    case "tool-recallCompanyKnowledge":
      return renderOk(part.output, (data) => <RecallKnowledgeCard data={data} />);
    case "tool-rememberCompanyFact":
      return renderOk(part.output, (data) => <RememberFactCard data={data} />);
    case "tool-forgetCompanyFact":
      return renderOk(part.output, (data) => <ForgetFactCard data={data} />);
    default:
      return <ToolActivity tool="generic" />;
  }
}

function renderOk<TOutput extends { ok: boolean }>(
  output: TOutput | undefined,
  render: (data: Extract<TOutput, { ok: true }>) => ReactNode,
): ReactNode {
  if (!output || typeof output !== "object") return null;
  if (!output.ok) {
    const reason = (output as { reason?: string }).reason;
    return <ToolError reason={reason ?? userCopy.ai.tool.failed} />;
  }
  return render(output as Extract<TOutput, { ok: true }>);
}
