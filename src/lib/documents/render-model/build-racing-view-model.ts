import { DocumentContext, resolveDocumentUi } from "@/lib/documents/document-context";
import { parseCompanyDocumentConfig } from "@/domain/document-config";
import {
  documentClientName,
  documentAssigneeSummary,
  documentLaborLineTotal,
  documentOrderDate,
  documentPrimaryMotor,
  documentPrimaryMotorEntity,
} from "@/lib/documents/document-helpers";
import { addDays } from "@/lib/documents/format";
import { resolveWarrantyForDocument } from "@/lib/documents/warranty/resolve-warranty";
import { formatDocumentDate, formatDocumentDateShort, formatDocumentMoney } from "@/lib/documents/format";
import { numberLocaleForDocument } from "@/lib/documents/document-locale";
import { DocumentFieldRow, DocumentLineItem } from "@/lib/documents/render-model/types";
import {
  buildLogbookTimeline,
  buildNextServiceInsight,
  buildWarrantyInsight,
  classifyServiceOrder,
  documentReleaseDate,
  documentVehicleTitle,
} from "@/lib/documents/work-order-insights";
import {
  formatMotorLineLabel,
  formatMotorLineSubtitle,
} from "@/lib/motors/format-motor-display-name";
import { GEARBOX_MARK } from "@/lib/documents/ai/document-label-rules";
import { userCopy } from "@/lib/user-copy";

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
  const ui = resolveDocumentUi(context.ui);
  return context.order.laborLines.map((line) => ({
    id: line.id,
    title: line.title,
    subtitle: line.description?.trim() || ui.laborKind,
    quantity: line.hours > 0 ? `${line.hours}${ui.hoursSuffix}` : "1",
    amount: formatDocumentMoney(documentLaborLineTotal(line)),
  }));
}

function buildPartRows(context: DocumentContext): DocumentLineItem[] {
  const ui = resolveDocumentUi(context.ui);
  const rows: DocumentLineItem[] = context.order.partLines.map((line) => {
    const marks = (context.motorLineMarks?.[`part:${line.id}`] ?? []).filter(Boolean);
    const markSuffix = marks.length > 0 ? ` · ${marks.join(" · ")}` : "";
    return {
      id: line.id,
      title: line.name,
      subtitle: `${ui.partKind}${markSuffix}`,
      quantity: String(line.quantity),
      amount: formatDocumentMoney(line.quantity * line.unitPrice),
    };
  });
  for (const line of context.order.motorLines) {
    const marks = context.motorLineMarks?.[line.id];
    rows.push({
      id: line.id,
      title: formatMotorLineLabel(line),
      subtitle: formatMotorLineSubtitle(line.outcome, marks),
      quantity: "1",
      amount: formatDocumentMoney(line.unitPrice),
    });
  }
  return rows;
}

function buildMotorDetailFields(context: DocumentContext): DocumentFieldRow[] {
  const ui = resolveDocumentUi(context.ui);
  const motorLine = documentPrimaryMotor(context);
  const motorEntity = documentPrimaryMotorEntity(context);
  if (!motorLine) return [];

  const marks = context.motorLineMarks?.[motorLine.id] ?? [];
  const markLabel = marks.length > 0 ? marks.join(" · ") : null;

  return [
    {
      label: ui.engine,
      value: formatMotorLineLabel(motorLine, { includeSerial: true }) || "—",
    },
    { label: ui.serialNumber, value: motorLine.serialCode || "—" },
    {
      label: ui.brandCode,
      value: [motorLine.brandName, motorLine.engineCode].filter(Boolean).join(" ") || "—",
    },
    { label: ui.configuration, value: motorLine.configuration || "—" },
    {
      label: ui.transmissionFull,
      value: motorEntity?.transmission?.trim() || markLabel || "—",
    },
    { label: ui.cost, value: formatDocumentMoney(motorLine.unitPrice) },
  ].filter((field) => field.value !== "—" || field.label === ui.engine);
}

function visitCountLabel(count: number): string {
  const racing = userCopy.documents.racing;
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return racing.visitOne;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return racing.visitFew;
  return racing.visitMany;
}

function visitNote(logbook: RacingLogbookPoint[]): string | null {
  const past = logbook.filter((e) => e.state === "past");
  if (past.length === 0) return null;
  const first = past[0];
  return userCopy.documents.racing.visitNote(past.length + 1, first.date);
}

function logbookSubtitle(logbook: RacingLogbookPoint[]): string | null {
  const past = logbook.filter((e) => e.state === "past");
  if (past.length === 0) return null;
  const first = past[0];
  const count = past.length + 1;
  return userCopy.documents.racing.logbookSubtitle(count, visitCountLabel(count), first.date);
}

function isContractMotorOrder(context: DocumentContext): boolean {
  return context.order.motorLines.length > 0;
}

function buildRacingLogbook(
  context: DocumentContext,
  profile: ReturnType<typeof classifyServiceOrder>,
  options?: { warrantyUntil?: Date | null; warrantyKm?: number },
): RacingLogbookPoint[] {
  const motorOrder = isContractMotorOrder(context);
  const insights = userCopy.documents.insights;
  const skip = new Set([insights.inspection, insights.oilChange, "Контрольный осмотр", "Замена масла"]);
  const entries = buildLogbookTimeline(context, profile).filter((entry) => {
    if (entry.title === insights.inspection || entry.title === "Контрольный осмотр") return false;
    if (motorOrder && skip.has(entry.title) && entry.state === "future") {
      return false;
    }
    return true;
  });

  if (motorOrder && options?.warrantyUntil) {
    const mileage = context.order.mileage || 0;
    const numLocale = numberLocaleForDocument(context.locale);
    const warrantyMileage =
      options.warrantyKm && options.warrantyKm > 0
        ? insights.km((mileage + options.warrantyKm).toLocaleString(numLocale))
        : undefined;
    entries.push({
      id: "warranty-end",
      date: formatDocumentDateShort(options.warrantyUntil),
      mileage: warrantyMileage,
      title: userCopy.documents.racing.warrantyActive,
      state: "future",
    });
  }

  return entries;
}

export function buildRacingViewModel(
  context: DocumentContext,
  options?: { disclaimer?: string; showServiceLogbook?: boolean },
): RacingViewModel {
  const racing = userCopy.documents.racing;
  const insights = userCopy.documents.insights;
  const numLocale = numberLocaleForDocument(context.locale);
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
    (warrantyPreset.days > 0 ? addDays(documentOrderDate(context), warrantyPreset.days) : null);

  let paidPrefix: string | null = null;
  let warrantyHighlight: string | null = null;
  if (context.order.pricing.grandTotal > 0) {
    paidPrefix = racing.paidPrefix;
    if (warrantyUntil && warrantyPreset.days > 0) {
      warrantyHighlight = racing.warrantyUntil(
        formatDocumentDate(warrantyUntil),
        warrantyPreset.days,
      );
    }
  }

  const nextService = !motorOrder && profile.showOilInterval ? buildNextServiceInsight(context) : null;

  let nextServiceKm: string | null = null;
  let nextServiceSub: string | null = null;

  if (nextService) {
    nextServiceKm = insights.km(nextService.dueMileage.toLocaleString(numLocale));
    nextServiceSub = racing.orUntil(
      formatDocumentDateShort(nextService.dueDate),
      nextService.intervalKm.toLocaleString(numLocale),
      String(nextService.intervalMonths),
    );
  } else if (motorOrder && warrantyPreset.km > 0) {
    const orderMileage = context.order.mileage || 0;
    nextServiceKm = insights.km((orderMileage + warrantyPreset.km).toLocaleString(numLocale));
    if (warrantyUntil) {
      nextServiceSub = racing.orUntilKm(
        formatDocumentDateShort(warrantyUntil),
        warrantyPreset.km.toLocaleString(numLocale),
      );
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
  const hasGearboxMark = context.order.motorLines.some((line) =>
    (context.motorLineMarks?.[line.id] ?? []).includes(GEARBOX_MARK),
  );
  const edgeRight = context.order.motorLines.some((l) => l.configuration?.toLowerCase().includes("акпп")) ||
    hasGearboxMark
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
    mileageLabel: racing.mileageOnOdo(mileage.toLocaleString(numLocale)),
    grandTotal: formatDocumentMoney(context.order.pricing.grandTotal),
    paidPrefix,
    warrantyHighlight,
    nextServiceLabel: motorOrder ? racing.warrantyMileage : racing.nextService,
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
      racing.defaultDisclaimer,
    edgeLeft,
    edgeRight,
  };
}
