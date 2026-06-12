import { DocumentContext } from "@/lib/documents/document-context";
import { parseCompanyDocumentConfig } from "@/domain/document-config";
import {
  documentClientName,
  documentAssigneeSummary,
  documentLaborLineTotal,
  documentOrderDate,
  documentPrimaryMotor,
  documentPrimaryMotorEntity,
} from "@/lib/documents/document-helpers";
import { addMonths } from "@/lib/documents/format";
import { resolveWarrantyForDocument } from "@/lib/documents/warranty/resolve-warranty";
import { formatDocumentDate, formatDocumentDateShort, formatDocumentMoney } from "@/lib/documents/format";
import { DocumentFieldRow, DocumentLineItem } from "@/lib/documents/render-model/types";
import {
  buildLogbookTimeline,
  buildNextServiceInsight,
  buildWarrantyInsight,
  classifyServiceOrder,
  documentReleaseDate,
  documentVehicleTitle,
} from "@/lib/documents/work-order-insights";
import { formatMotorLineLabel } from "@/lib/motors/format-motor-display-name";

export type RacingLogbookPoint = {
  id: string;
  date: string;
  mileage?: string;
  title: string;
  state: "past" | "current" | "future";
};

export type RacingViewModel = {
  vehicleTitle: string;
  vin: string;
  plate: string;
  orderRef: string;
  documentDate: string;
  companyLines: string[];
  mileage: number;
  mileageLabel: string;
  grandTotal: string;
  paidPrefix: string | null;
  warrantyHighlight: string | null;
  nextServiceLabel: string;
  nextServiceKm: string | null;
  nextServiceSub: string | null;
  logbookSubtitle: string | null;
  milestoneTarget: number;
  milestoneRemaining: number;
  laborRows: DocumentLineItem[];
  partRows: DocumentLineItem[];
  logbook: RacingLogbookPoint[];
  showServiceLogbook: boolean;
  motorDetailFields: DocumentFieldRow[];
  clientName: string;
  executorName: string;
  visitNote: string | null;
  disclaimer: string;
  edgeLeft: string;
  edgeRight: string;
};

function racingMilestone(mileage: number): { target: number; remaining: number } {
  const step = mileage >= 100_000 ? 100_000 : 50_000;
  const target = Math.ceil(Math.max(mileage, 1) / step) * step;
  return { target, remaining: Math.max(0, target - mileage) };
}

function buildLaborRows(context: DocumentContext): DocumentLineItem[] {
  return context.order.laborLines.map((line) => ({
    id: line.id,
    title: line.title,
    subtitle: line.description?.trim() || "Работа",
    quantity: line.hours > 0 ? `${line.hours} ч` : "1",
    amount: formatDocumentMoney(documentLaborLineTotal(line)),
  }));
}

function buildPartRows(context: DocumentContext): DocumentLineItem[] {
  const rows: DocumentLineItem[] = context.order.partLines.map((line) => ({
    id: line.id,
    title: line.name,
    subtitle: "Запчасть",
    quantity: String(line.quantity),
    amount: formatDocumentMoney(line.quantity * line.unitPrice),
  }));
  for (const line of context.order.motorLines) {
    rows.push({
      id: line.id,
      title: formatMotorLineLabel(line),
      subtitle: line.outcome === "sell" ? "Продажа" : "Установка",
      quantity: "1",
      amount: formatDocumentMoney(line.unitPrice),
    });
  }
  return rows;
}

function buildMotorDetailFields(context: DocumentContext): DocumentFieldRow[] {
  const motorLine = documentPrimaryMotor(context);
  const motorEntity = documentPrimaryMotorEntity(context);
  if (!motorLine) return [];

  return [
    { label: "Двигатель", value: formatMotorLineLabel(motorLine, { includeSerial: true }) || "—" },
    { label: "Серийный номер", value: motorLine.serialCode || "—" },
    {
      label: "Марка / код",
      value: [motorLine.brandName, motorLine.engineCode].filter(Boolean).join(" ") || "—",
    },
    { label: "Комплектация", value: motorLine.configuration || "—" },
    { label: "Коробка передач", value: motorEntity?.transmission?.trim() || "—" },
    { label: "Стоимость", value: formatDocumentMoney(motorLine.unitPrice) },
  ].filter((field) => field.value !== "—" || field.label === "Двигатель");
}

function visitCountLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "заезд";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "заезда";
  return "заездов";
}

function visitNote(logbook: RacingLogbookPoint[]): string | null {
  const past = logbook.filter((e) => e.state === "past");
  if (past.length === 0) return null;
  const first = past[0];
  return `— ${past.length + 1}-й заезд с ${first.date}`;
}

function logbookSubtitle(logbook: RacingLogbookPoint[]): string | null {
  const past = logbook.filter((e) => e.state === "past");
  if (past.length === 0) return null;
  const first = past[0];
  const count = past.length + 1;
  return `${count} ${visitCountLabel(count)} на этом авто с ${first.date}`;
}

const RACING_LOGBOOK_SKIP = new Set(["Контрольный осмотр", "Замена масла"]);

function isContractMotorOrder(context: DocumentContext): boolean {
  return context.order.motorLines.length > 0;
}

function buildRacingLogbook(
  context: DocumentContext,
  profile: ReturnType<typeof classifyServiceOrder>,
  options?: { warrantyUntil?: Date | null; warrantyKm?: number },
): RacingLogbookPoint[] {
  const motorOrder = isContractMotorOrder(context);
  const entries = buildLogbookTimeline(context, profile).filter((entry) => {
    if (entry.title === "Контрольный осмотр") return false;
    if (motorOrder && RACING_LOGBOOK_SKIP.has(entry.title) && entry.state === "future") {
      return false;
    }
    return true;
  });

  if (motorOrder && options?.warrantyUntil) {
    const mileage = context.order.mileage || 0;
    const warrantyMileage =
      options.warrantyKm && options.warrantyKm > 0
        ? `${(mileage + options.warrantyKm).toLocaleString("ru-KZ")} км`
        : undefined;
    entries.push({
      id: "warranty-end",
      date: formatDocumentDateShort(options.warrantyUntil),
      mileage: warrantyMileage,
      title: "Гарантия активна",
      state: "future",
    });
  }

  return entries;
}

export function buildRacingViewModel(
  context: DocumentContext,
  options?: { disclaimer?: string; showServiceLogbook?: boolean },
): RacingViewModel {
  const showServiceLogbook = options?.showServiceLogbook !== false;
  const profile = classifyServiceOrder(context);
  const mileage = context.order.mileage || context.vehicle?.currentMileage || 0;
  const milestone = racingMilestone(mileage);
  const motorOrder = isContractMotorOrder(context);
  const warrantyInsight = buildWarrantyInsight(context);
  const documentConfig =
    context.company.documentConfig ?? parseCompanyDocumentConfig({});
  const warrantyPreset = resolveWarrantyForDocument(context.company, documentConfig, {
    forEngine: context.order.motorLines.length > 0,
  });
  const warrantyUntil =
    warrantyInsight?.untilDate ??
    (warrantyPreset.months > 0 ? addMonths(documentOrderDate(context), warrantyPreset.months) : null);

  let paidPrefix: string | null = null;
  let warrantyHighlight: string | null = null;
  if (context.order.pricing.grandTotal > 0) {
    paidPrefix = "оплачено —";
    if (warrantyUntil && warrantyPreset.months > 0) {
      warrantyHighlight = `гарантия до ${formatDocumentDate(warrantyUntil)} (${warrantyPreset.months * 30} дней)`;
    }
  }

  const nextService = !motorOrder && profile.showOilInterval ? buildNextServiceInsight(context) : null;

  let nextServiceKm: string | null = null;
  let nextServiceSub: string | null = null;

  if (nextService) {
    nextServiceKm = `${nextService.dueMileage.toLocaleString("ru-KZ")} км`;
    nextServiceSub = `или до ${formatDocumentDateShort(nextService.dueDate)} + ${nextService.intervalKm.toLocaleString("ru-KZ")} км / ${nextService.intervalMonths} мес`;
  } else if (motorOrder && warrantyPreset.km > 0) {
    const mileage = context.order.mileage || 0;
    nextServiceKm = `${(mileage + warrantyPreset.km).toLocaleString("ru-KZ")} км`;
    if (warrantyUntil) {
      nextServiceSub = `или до ${formatDocumentDateShort(warrantyUntil)} + ${warrantyPreset.km.toLocaleString("ru-KZ")} км`;
    }
  }

  const logbook = showServiceLogbook
    ? buildRacingLogbook(context, profile, {
        warrantyUntil,
        warrantyKm: warrantyPreset.km,
      })
    : [];
  const motorDetailFields = !showServiceLogbook ? buildMotorDetailFields(context) : [];

  const companyLines = [
    context.company.address,
    [context.company.phone, context.company.email].filter(Boolean).join(" · "),
    context.company.website,
  ].filter((line): line is string => Boolean(line?.trim()));

  const edgeLeft = motorOrder ? "DVS" : profile.showOilInterval ? "MASLO" : "SVC";
  const edgeRight = context.order.motorLines.some((l) => l.configuration?.toLowerCase().includes("акпп"))
    ? "TGM"
    : profile.showEngineWarranty
      ? "GAR"
      : "TGM";

  return {
    vehicleTitle: documentVehicleTitle(context).toUpperCase(),
    vin: context.order.vin || context.vehicle?.vin || "—",
    plate: context.order.licensePlate || context.vehicle?.licensePlate || "—",
    orderRef: context.orderLabel.replace(/^№\s*/, ""),
    documentDate: formatDocumentDate(documentReleaseDate(context)),
    companyLines,
    mileage,
    mileageLabel: `${mileage.toLocaleString("ru-KZ")} км на одометре`,
    grandTotal: formatDocumentMoney(context.order.pricing.grandTotal),
    paidPrefix,
    warrantyHighlight,
    nextServiceLabel: motorOrder ? "ГАРАНТИЙНЫЙ ПРОБЕГ" : "СЛЕДУЮЩАЯ ЗАМЕНА",
    nextServiceKm,
    nextServiceSub,
    logbookSubtitle: showServiceLogbook ? logbookSubtitle(logbook) : null,
    milestoneTarget: milestone.target,
    milestoneRemaining: milestone.remaining,
    laborRows: buildLaborRows(context),
    partRows: buildPartRows(context),
    logbook,
    showServiceLogbook,
    motorDetailFields,
    clientName: documentClientName(context),
    executorName: documentAssigneeSummary(context),
    visitNote: showServiceLogbook ? visitNote(logbook) : null,
    disclaimer:
      options?.disclaimer?.trim() ||
      context.company.warrantyText?.trim() ||
      "Гарантия на работы действует при соблюдении регламента эксплуатации. Расходные материалы — по условиям сервиса.",
    edgeLeft,
    edgeRight,
  };
}
