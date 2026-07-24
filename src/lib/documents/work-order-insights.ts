import { parseCompanyDocumentConfig } from "@/domain/document-config";
import {
  SERVICE_TAG_OIL_INTERVAL_KM,
  SERVICE_TAG_OIL_INTERVAL_MONTHS,
} from "@/lib/documents/document-copy";
import {
  classifyServiceOrder,
  summarizeOrderForLogbook,
  type ServiceOrderProfile,
} from "@/lib/documents/classify-service-order";
import { DocumentContext } from "@/lib/documents/document-context";
import { numberLocaleForDocument } from "@/lib/documents/document-locale";
import {
  documentOrderDate,
  documentPrimaryMotor,
  documentPrimaryMotorEntity,
} from "@/lib/documents/document-helpers";
import { addDays, addMonths,
  coerceDocumentDate,
  daysBetween,
  formatDocumentDateShort,
} from "@/lib/documents/format";
import { resolveWarrantyForDocument } from "@/lib/documents/warranty/resolve-warranty";
import { getAppUrl } from "@/lib/site-urls";
import { userCopy } from "@/lib/user-copy";

export type WarrantyInsight = {
  days: number;
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
    const numLocale = numberLocaleForDocument(context.locale);
    entries.push({
      id: source.workOrderId,
      date: formatDocumentDateShort(coerceDocumentDate(source.date, documentReleaseDate(context))),
      mileage: source.mileage
        ? userCopy.documents.insights.km(source.mileage.toLocaleString(numLocale))
        : undefined,
      title: source.title,
      state: isCurrent ? "current" : "past",
    });
  }

  const hasCurrent = entries.some((entry) => entry.state === "current");
  if (!hasCurrent) {
    const numLocale = numberLocaleForDocument(context.locale);
    entries.push({
      id: currentId,
      date: formatDocumentDateShort(documentReleaseDate(context)),
      mileage: context.order.mileage
        ? userCopy.documents.insights.km(context.order.mileage.toLocaleString(numLocale))
        : undefined,
      title: summarizeOrderForLogbook(context),
      state: "current",
    });
  }

  if (resolvedProfile.showOilInterval) {
    const next = buildNextServiceInsight(context);
    const numLocale = numberLocaleForDocument(context.locale);
    entries.push({
      id: "next-oil",
      date: formatDocumentDateShort(next.dueDate),
      mileage: userCopy.documents.insights.km(next.dueMileage.toLocaleString(numLocale)),
      title: userCopy.documents.insights.oilChange,
      state: "future",
    });
  }

  if (resolvedProfile.showControlInspection) {
    const mileage = (context.order.mileage || 0) + 1_000;
    const numLocale = numberLocaleForDocument(context.locale);
    entries.push({
      id: "next-inspection",
      date: formatDocumentDateShort(addMonths(documentReleaseDate(context), 1)),
      mileage: userCopy.documents.insights.km(mileage.toLocaleString(numLocale)),
      title: userCopy.documents.insights.inspection,
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
  return context.order.vehicleLabel?.trim() || userCopy.documents.insights.vehicleFallback;
}

export function documentVehicleYear(context: DocumentContext): string {
  if (context.vehicle?.year) return String(context.vehicle.year);
  return "—";
}

export function buildWarrantyInsight(context: DocumentContext): WarrantyInsight | null {
  const motorLine = documentPrimaryMotor(context);
  if (!motorLine || motorLine.outcome !== "install") return null;

  const documentConfig = context.company.documentConfig ?? parseCompanyDocumentConfig({});
  const warranty = resolveWarrantyForDocument(context.company, documentConfig, { forEngine: true });
  const installDate = documentOrderDate(context);
  const mileage = context.order.mileage || 0;

  if (warranty.days <= 0 || warranty.km <= 0) {
    return {
      days: 0,
      km: 0,
      untilDate: installDate,
      untilMileage: mileage,
      status: "inactive",
      statusLabel: warranty.statusLabel,
    };
  }

  const untilDate = addDays(installDate, warranty.days);

  return {
    days: warranty.days,
    km: warranty.km,
    untilDate,
    untilMileage: mileage + warranty.km,
    status: "active",
    statusLabel: warranty.statusLabel,
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
  const kmMatch = notes.match(/(\d[\d\s]*)\s*(?:км|km)/i);
  if (kmMatch?.[1]) {
    return userCopy.documents.insights.km(kmMatch[1].replace(/\s/g, ""));
  }
  if (context.order.mileage) {
    return userCopy.documents.insights.km(
      context.order.mileage.toLocaleString(numberLocaleForDocument(context.locale)),
    );
  }
  return "—";
}
