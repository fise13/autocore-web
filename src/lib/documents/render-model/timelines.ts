import { MotorHistoryEntry } from "@/domain/motor";
import { DocumentContext } from "@/lib/documents/document-context";
import { isEnglishDocumentLocale } from "@/lib/documents/document-locale";
import { documentNumberLocale, formatDocumentDate, isValidDocumentDate } from "@/lib/documents/format";
import {
  documentAssigneeSummary,
  documentPrimaryMotorEntity,
} from "@/lib/documents/document-helpers";
import { buildLogbookTimeline, classifyServiceOrder } from "@/lib/documents/work-order-insights";
import { DocumentTimelineEvent } from "@/lib/documents/render-model/types";

const MOTOR_HISTORY_LABELS_RU: Record<MotorHistoryEntry["type"], string> = {
  reserved: "Зарезервирован",
  released: "Снята резервация",
  installed: "Установлен",
  sold: "Продан",
};

const MOTOR_HISTORY_LABELS_EN: Record<MotorHistoryEntry["type"], string> = {
  reserved: "Reserved",
  released: "Reservation released",
  installed: "Installed",
  sold: "Sold",
};

export function buildVehicleHistoryTimeline(context: DocumentContext): DocumentTimelineEvent[] {
  const en = isEnglishDocumentLocale(context.locale);
  const profile = classifyServiceOrder(context);
  const logbook = buildLogbookTimeline(context, profile);
  const assignee = documentAssigneeSummary(context);
  const responsible = assignee !== "—" ? assignee : context.company.name;

  const events: DocumentTimelineEvent[] = [];

  if (isValidDocumentDate(context.order.createdAt)) {
    events.push({
      id: "intake",
      label: en ? "Vehicle intake" : "Поступление автомобиля",
      date: formatDocumentDate(context.order.createdAt),
      mileage: context.order.mileage
        ? `${context.order.mileage.toLocaleString(documentNumberLocale())} ${en ? "km" : "км"}`
        : undefined,
      responsible,
      kind: "vehicle",
    });
  }

  for (const entry of logbook) {
    events.push({
      id: `log-${entry.title}-${entry.date}`,
      label: entry.title,
      date: entry.date,
      mileage: entry.mileage,
      responsible,
      kind: "vehicle",
    });
  }

  if (context.order.status === "completed" && isValidDocumentDate(context.order.completedAt)) {
    events.push({
      id: "handover",
      label: en ? "Handed over to customer" : "Выдача клиенту",
      date: formatDocumentDate(context.order.completedAt),
      responsible,
      kind: "vehicle",
    });
  }

  return events;
}

export function buildAggregateHistoryTimeline(context: DocumentContext): DocumentTimelineEvent[] {
  const en = isEnglishDocumentLocale(context.locale);
  const motorHistoryLabels = en ? MOTOR_HISTORY_LABELS_EN : MOTOR_HISTORY_LABELS_RU;
  const motor = documentPrimaryMotorEntity(context);
  if (!motor) return [];

  const assignee = documentAssigneeSummary(context);
  const responsible = assignee !== "—" ? assignee : context.company.name;
  const events: DocumentTimelineEvent[] = [];

  if (isValidDocumentDate(motor.arrivalDate)) {
    events.push({
      id: "arrival",
      label: en ? "Arrived at warehouse" : "Поступил на склад",
      date: formatDocumentDate(motor.arrivalDate),
      responsible,
      kind: "aggregate",
    });
  }

  if (motor.motorHistory?.length) {
    for (const entry of [...motor.motorHistory]
      .filter((item) => isValidDocumentDate(item.createdAt))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
      events.push({
        id: entry.id,
        label: motorHistoryLabels[entry.type] ?? entry.type,
        date: formatDocumentDate(entry.createdAt),
        responsible: entry.actorUserId ?? responsible,
        kind: "aggregate",
      });
    }
  } else {
    if (motor.status === "sold" || motor.soldDate) {
      events.push({
        id: "sold",
        label: en ? "Sold" : "Продан",
        date: isValidDocumentDate(motor.soldDate)
          ? formatDocumentDate(motor.soldDate)
          : formatDocumentDate(context.generatedAt),
        responsible,
        kind: "aggregate",
      });
    }
    if (motor.status === "installed" || motor.installedWorkOrderId) {
      events.push({
        id: "installed",
        label: en ? "Installed" : "Установлен",
        date: formatDocumentDate(context.generatedAt),
        responsible,
        kind: "aggregate",
      });
    }
  }

  if (context.warrantyVerificationToken) {
    events.push({
      id: "warranty-active",
      label: en ? "Warranty active" : "Гарантия активна",
      date: formatDocumentDate(context.generatedAt),
      responsible: context.company.name,
      kind: "aggregate",
    });
  }

  return events;
}
