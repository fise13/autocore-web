import { DocumentContext } from "@/lib/documents/document-context";
import { WorkOrder } from "@/domain/work-order";
import { documentLaborLineTotal } from "@/lib/documents/document-helpers";
import { formatDocumentMoney } from "@/lib/documents/format";

export type ServiceOrderKind = "oil_change" | "engine_install" | "diagnostics" | "general";

export type ServiceOrderProfile = {
  kind: ServiceOrderKind;
  showOilInterval: boolean;
  showEngineBlock: boolean;
  showEngineWarranty: boolean;
  showBreakInNotes: boolean;
  showControlInspection: boolean;
  showDiagnosticsNotes: boolean;
  showPartsBlock: boolean;
};

const OIL_PATTERN = /масл|oil|залив|слив.*масл/i;
const FILTER_PATTERN = /фильтр|filter/i;
const ENGINE_PATTERN = /двигат|motor|engine|двс/i;
const GEARBOX_PATTERN = /коробк|акпп|мкпп|transmission|cvt/i;
const DIAGNOSTIC_PATTERN = /диагност|осмотр|проверк|сканир|компьютер/i;

function textMatches(lines: string[], pattern: RegExp): boolean {
  return lines.some((line) => pattern.test(line));
}

function collectText(context: DocumentContext): {
  laborTitles: string[];
  partNames: string[];
  hasMotorInstall: boolean;
} {
  const laborTitles = context.order.laborLines.map((line) => line.title);
  const partNames = context.order.partLines.map((line) => line.name);
  const hasMotorInstall = context.order.motorLines.some((line) => line.outcome === "install");

  return { laborTitles, partNames, hasMotorInstall };
}

export function classifyServiceOrder(context: DocumentContext): ServiceOrderProfile {
  const { laborTitles, partNames, hasMotorInstall } = collectText(context);
  const allText = [...laborTitles, ...partNames];

  const isOilChange =
    textMatches(allText, OIL_PATTERN) ||
    (textMatches(allText, FILTER_PATTERN) && textMatches(laborTitles, /замен|обслуж/i));
  const isEngine =
    hasMotorInstall || textMatches(laborTitles, ENGINE_PATTERN) || context.order.motorLines.length > 0;
  const isDiagnostics =
    textMatches(laborTitles, DIAGNOSTIC_PATTERN) ||
    context.order.laborLines.some((line) => line.assigneeRole === "diagnostician");

  let kind: ServiceOrderKind = "general";
  if (isEngine) kind = "engine_install";
  else if (isOilChange) kind = "oil_change";
  else if (isDiagnostics && !isOilChange) kind = "diagnostics";

  const hasDiagnosticContent = Boolean(
    context.order.comment?.trim() ||
      context.order.laborLines.some((line) => line.description?.trim() || DIAGNOSTIC_PATTERN.test(line.title)),
  );

  return {
    kind,
    showOilInterval: isOilChange && !isEngine,
    showEngineBlock: isEngine,
    showEngineWarranty: hasMotorInstall || context.order.motorLines.some((line) => line.outcome === "sell"),
    showBreakInNotes: hasMotorInstall,
    showControlInspection: false,
    showDiagnosticsNotes: isDiagnostics && hasDiagnosticContent,
    showPartsBlock: context.order.partLines.length > 0,
  };
}

export function summarizeOrderForLogbook(context: DocumentContext): string {
  const profile = classifyServiceOrder(context);
  const { laborTitles, hasMotorInstall } = collectText(context);

  if (context.order.motorLines.length > 0) {
    const motor = context.order.motorLines[0];
    const code = [motor.brandName, motor.engineCode, motor.serialCode].filter(Boolean).join(" ");
    if (motor.outcome === "sell") {
      return code ? `Продажа двигателя ${code}` : "Продажа двигателя";
    }
    return code ? `Установка двигателя ${code}` : "Установка двигателя";
  }

  if (profile.kind === "engine_install") {
    return "Установка двигателя";
  }

  if (profile.kind === "oil_change") return "Замена масла";
  if (profile.kind === "diagnostics") return laborTitles[0] ?? "Диагностика";
  if (laborTitles.length >= 1) return laborTitles[0]!;
  if (hasMotorInstall) return "Установка агрегата";
  return "Обслуживание";
}

export function buildLaborLinesForDocument(context: DocumentContext) {
  return context.order.laborLines.map((line) => ({
    id: line.id,
    title: line.title,
    subtitle: line.description?.trim(),
    amount: formatDocumentMoney(documentLaborLineTotal(line)),
  }));
}

export function buildPartLinesForDocument(context: DocumentContext) {
  return context.order.partLines.map((line) => ({
    id: line.id,
    title: line.quantity > 1 ? `${line.name} × ${line.quantity}` : line.name,
    amount: formatDocumentMoney(line.quantity * line.unitPrice),
  }));
}

export function hasGearboxWork(context: DocumentContext): boolean {
  const allText = [
    ...context.order.laborLines.map((line) => line.title),
    ...context.order.partLines.map((line) => line.name),
  ];
  return textMatches(allText, GEARBOX_PATTERN);
}

export function buildDiagnosticNotes(context: DocumentContext): string[] {
  const notes: string[] = [];
  if (context.order.comment?.trim()) notes.push(context.order.comment.trim());

  for (const line of context.order.laborLines) {
    if (line.description?.trim()) {
      notes.push(`${line.title}: ${line.description.trim()}`);
    }
  }

  return notes;
}

export function buildBreakInNotes(): string[] {
  return ["Щадящий режим первые 1 000 км — без резких разгонов."];
}

export function buildOilRelatedParts(context: DocumentContext) {
  return context.order.partLines.filter(
    (line) => OIL_PATTERN.test(line.name) || FILTER_PATTERN.test(line.name),
  );
}

export function summarizeWorkOrderForLogbook(order: WorkOrder): string {
  const laborTitles = order.laborLines.map((line) => line.title);
  const partNames = order.partLines.map((line) => line.name);
  const allText = [...laborTitles, ...partNames];
  const hasMotorInstall = order.motorLines.some((line) => line.outcome === "install");

  const isEngine =
    hasMotorInstall || textMatches(laborTitles, ENGINE_PATTERN) || order.motorLines.length > 0;
  const isOilChange =
    textMatches(allText, OIL_PATTERN) ||
    (textMatches(allText, FILTER_PATTERN) && textMatches(laborTitles, /замен|обслуж/i));
  const isDiagnostics =
    textMatches(laborTitles, DIAGNOSTIC_PATTERN) ||
    order.laborLines.some((line) => line.assigneeRole === "diagnostician");

  if (order.motorLines.length > 0) {
    const motor = order.motorLines[0];
    const code = [motor.brandName, motor.engineCode, motor.serialCode].filter(Boolean).join(" ");
    if (motor.outcome === "sell") {
      return code ? `Продажа двигателя ${code}` : "Продажа двигателя";
    }
    return code ? `Установка двигателя ${code}` : "Установка двигателя";
  }
  if (isOilChange) return "Замена масла";
  if (isDiagnostics) return laborTitles[0] ?? "Диагностика";
  if (laborTitles.length >= 1) return laborTitles[0]!;
  return "Обслуживание";
}
