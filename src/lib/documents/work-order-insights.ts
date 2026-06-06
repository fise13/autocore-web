import {
  ENGINE_WARRANTY_KM,
  ENGINE_WARRANTY_MONTHS,
  SERVICE_TAG_OIL_INTERVAL_KM,
  SERVICE_TAG_OIL_INTERVAL_MONTHS,
} from "@/lib/documents/document-copy";
import {
  classifyServiceOrder,
  summarizeOrderForLogbook,
  type ServiceOrderProfile,
} from "@/lib/documents/classify-service-order";
import { DocumentContext } from "@/lib/documents/document-context";
import {
  documentOrderDate,
  documentPrimaryMotor,
  documentPrimaryMotorEntity,
} from "@/lib/documents/document-helpers";
import {
  addMonths,
  coerceDocumentDate,
  daysBetween,
  formatDocumentDateShort,
} from "@/lib/documents/format";
import { getAppUrl } from "@/lib/site-urls";

export type WarrantyInsight = {
  months: number;
  km: number;
  untilDate: Date;
  untilMileage: number;
  status: "active" | "inactive";
  statusLabel: string;
};

export type NextServiceInsight = {
  dueDate: Date;
  dueMileage: number;
  intervalKm: number;
  intervalMonths: number;
  daysRemaining: number;
  kmRemaining: number;
  progressPercent: number;
};

export type LogbookEntry = {
  id: string;
  date: string;
  mileage?: string;
  title: string;
  state: "past" | "current" | "future";
};

export type MilestoneInsight = {
  target: number;
  previous: number;
  progressPercent: number;
  kmRemaining: number;
};

export function documentNextMilestone(mileage: number): MilestoneInsight {
  const step = 50_000;
  const target = Math.ceil(Math.max(mileage, 1) / step) * step;
  const previous = Math.max(0, target - step);
  const span = target - previous;
  const progressPercent = span > 0 ? Math.min(100, Math.round(((mileage - previous) / span) * 100)) : 0;

  return {
    target,
    previous,
    progressPercent,
    kmRemaining: Math.max(0, target - mileage),
  };
}

export type { ServiceOrderProfile };

export function buildLogbookTimeline(context: DocumentContext, profile?: ServiceOrderProfile): LogbookEntry[] {
  const resolvedProfile = profile ?? classifyServiceOrder(context);
  const currentId = context.order.id;
  const entries: LogbookEntry[] = [];

  const history =
    context.vehicleLogbook.length > 0
      ? context.vehicleLogbook
      : [
          {
            workOrderId: currentId,
            date: documentReleaseDate(context),
            mileage: context.order.mileage || 0,
            title: summarizeOrderForLogbook(context),
          },
        ];

  for (const source of history) {
    const isCurrent = source.workOrderId === currentId;
    entries.push({
      id: source.workOrderId,
      date: formatDocumentDateShort(coerceDocumentDate(source.date, documentReleaseDate(context))),
      mileage: source.mileage ? `${source.mileage.toLocaleString("ru-KZ")} км` : undefined,
      title: source.title,
      state: isCurrent ? "current" : "past",
    });
  }

  const hasCurrent = entries.some((entry) => entry.state === "current");
  if (!hasCurrent) {
    entries.push({
      id: currentId,
      date: formatDocumentDateShort(documentReleaseDate(context)),
      mileage: context.order.mileage
        ? `${context.order.mileage.toLocaleString("ru-KZ")} км`
        : undefined,
      title: summarizeOrderForLogbook(context),
      state: "current",
    });
  }

  if (resolvedProfile.showOilInterval) {
    const next = buildNextServiceInsight(context);
    entries.push({
      id: "next-oil",
      date: formatDocumentDateShort(next.dueDate),
      mileage: `${next.dueMileage.toLocaleString("ru-KZ")} км`,
      title: "Замена масла",
      state: "future",
    });
  }

  if (resolvedProfile.showControlInspection) {
    const mileage = (context.order.mileage || 0) + 1_000;
    entries.push({
      id: "next-inspection",
      date: formatDocumentDateShort(addMonths(documentReleaseDate(context), 1)),
      mileage: `${mileage.toLocaleString("ru-KZ")} км`,
      title: "Контрольный осмотр",
      state: "future",
    });
  }

  return entries;
}

export { classifyServiceOrder, summarizeOrderForLogbook };

export function documentVehicleHistoryUrl(context: DocumentContext): string {
  const base = getAppUrl();
  const params = new URLSearchParams();
  if (context.vehicle?.id) params.set("vehicleId", context.vehicle.id);
  params.set("orderId", context.order.id);
  const query = params.toString();
  return `${base}/work-orders${query ? `?${query}` : ""}`;
}

export function documentIntakeDate(context: DocumentContext): Date {
  return context.order.confirmedAt ?? context.order.createdAt;
}

export function documentReleaseDate(context: DocumentContext): Date {
  return context.order.deliveredAt ?? context.order.completedAt ?? context.order.updatedAt;
}

export function documentVehicleMake(context: DocumentContext): string {
  return context.vehicle?.make ?? context.order.vehicleLabel?.split(/\s+/)[0] ?? "—";
}

export function documentVehicleModel(context: DocumentContext): string {
  return context.vehicle?.model ?? context.order.vehicleLabel?.split(/\s+/).slice(1).join(" ") ?? "—";
}

export function documentVehicleTitle(context: DocumentContext): string {
  if (context.vehicle) {
    return [context.vehicle.make, context.vehicle.model].filter(Boolean).join(" ");
  }
  return context.order.vehicleLabel?.trim() || "Автомобиль";
}

export function documentVehicleYear(context: DocumentContext): string {
  if (context.vehicle?.year) return String(context.vehicle.year);
  return "—";
}

export function buildWarrantyInsight(context: DocumentContext): WarrantyInsight | null {
  const motorLine = documentPrimaryMotor(context);
  if (!motorLine || motorLine.outcome !== "install") return null;

  const installDate = documentOrderDate(context);
  const untilDate = addMonths(installDate, ENGINE_WARRANTY_MONTHS);
  const mileage = context.order.mileage || 0;

  return {
    months: ENGINE_WARRANTY_MONTHS,
    km: ENGINE_WARRANTY_KM,
    untilDate,
    untilMileage: mileage + ENGINE_WARRANTY_KM,
    status: "active",
    statusLabel: "Активна",
  };
}

export function buildNextServiceInsight(context: DocumentContext): NextServiceInsight {
  const intervalKm = context.company.serviceIntervalKm ?? SERVICE_TAG_OIL_INTERVAL_KM;
  const intervalMonths = context.company.serviceIntervalMonths ?? SERVICE_TAG_OIL_INTERVAL_MONTHS;
  const serviceDate = documentOrderDate(context);
  const dueDate = addMonths(serviceDate, intervalMonths);
  const mileage = context.order.mileage || 0;
  const dueMileage = mileage + intervalKm;
  const reference = context.generatedAt ?? serviceDate;

  return {
    dueDate,
    dueMileage,
    intervalKm,
    intervalMonths,
    daysRemaining: daysBetween(reference, dueDate),
    kmRemaining: intervalKm,
    progressPercent: 0,
  };
}

export function documentEngineMileage(context: DocumentContext): string {
  const motor = documentPrimaryMotorEntity(context);
  const notes = motor?.notes ?? "";
  const kmMatch = notes.match(/(\d[\d\s]*)\s*км/i);
  if (kmMatch?.[1]) return `${kmMatch[1].replace(/\s/g, "")} км`;
  if (context.order.mileage) return `${context.order.mileage.toLocaleString("ru-KZ")} км`;
  return "—";
}
