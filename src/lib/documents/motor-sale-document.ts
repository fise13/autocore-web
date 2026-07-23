import { DocumentContext } from "@/lib/documents/document-context";
import { DocumentSlug } from "@/lib/documents/document-types";
import { DocumentTemplateMeta } from "@/lib/documents/templates/document-template-meta";
import { ResolvedWarranty } from "@/lib/documents/warranty/resolve-warranty";
import { documentPrimaryMotor } from "@/lib/documents/document-helpers";
import { formatMotorLineLabel } from "@/lib/motors/format-motor-display-name";

/** Standalone motor sale: sold engine without work-order labor/parts. */
export function isStandaloneMotorSale(context: DocumentContext): boolean {
  const motor = documentPrimaryMotor(context);
  if (!motor || motor.outcome !== "sell") return false;
  if (context.order.laborLines.length > 0) return false;
  if (context.order.partLines.length > 0) return false;
  return true;
}

function isEnglishLocale(locale?: string): boolean {
  return Boolean(locale?.toLowerCase().startsWith("en"));
}

export function formatMotorSaleDocumentLabel(context: DocumentContext): string {
  const en = isEnglishLocale(context.locale);
  const motor = documentPrimaryMotor(context);
  if (!motor) return en ? "Engine sale" : "Продажа двигателя";
  const engineWord = en ? "Engine" : "Двигатель";
  const saleWord = en ? "Engine sale" : "Продажа двигателя";
  const label = formatMotorLineLabel(motor, { includeSerial: true });
  return label !== engineWord && label !== "Двигатель" ? `${saleWord} · ${label}` : saleWord;
}

export function motorSaleDocumentMeta(
  slug: DocumentSlug,
  base: DocumentTemplateMeta,
  locale?: DocumentContext["locale"],
): DocumentTemplateMeta {
  const en = isEnglishLocale(locale);

  if (slug === "engine-warranty") {
    return {
      ...base,
      title: en ? "Engine warranty certificate" : "Гарантийный талон на двигатель",
      tag: en ? "Warranty" : "Гарантия",
      lead: en
        ? "Confirmation of the contract engine sale and warranty service terms."
        : "Подтверждение продажи контрактного двигателя и условий гарантийного обслуживания.",
      primaryLabel: en ? "Warranty term" : "Срок гарантии",
      warrantyBlock: en
        ? "Warranty does not cover normal wear, misuse, or external damage."
        : "Гарантия не распространяется на естественный износ, нарушение эксплуатации и внешние повреждения.",
      footer: en
        ? "This document confirms the seller’s warranty obligations. Keep it for claims."
        : "Документ подтверждает гарантийные обязательства продавца. Сохраните для предъявления претензий.",
    };
  }

  if (slug === "invoice") {
    return {
      ...base,
      title: en ? "Engine invoice" : "Счёт на оплату двигателя",
      tag: en ? "Invoice" : "Счёт",
      lead: en
        ? "Invoice for the contract engine. Items and price are listed below."
        : "Счёт на оплату контрактного двигателя. Состав и стоимость указаны ниже.",
      primaryLabel: en ? "Invoice total" : "Сумма счёта",
      warrantyBlock: "",
      footer: en
        ? "Invoice generated automatically. Payment purpose: contract engine purchase."
        : "Счёт сформирован автоматически. Назначение платежа: оплата контрактного двигателя.",
      disclaimer: en
        ? "Valid for 5 business days. Payment confirms agreement with the engine configuration and price."
        : "Счёт действителен 5 рабочих дней. Оплата подтверждает согласие с комплектацией и стоимостью двигателя.",
    };
  }

  if (slug === "engine-waybill") {
    return {
      ...base,
      title: en ? "Engine waybill" : "Накладная на двигатель",
      tag: en ? "Handover" : "Передача",
      lead: en
        ? "Confirms handover of the engine to the buyer: configuration, condition, and price."
        : "Документ подтверждает передачу двигателя покупателю: комплектацию, состояние и стоимость.",
      primaryLabel: en ? "Price" : "Стоимость",
      disclaimer: en
        ? "The engine was handed over in the agreed condition. Configuration checked by both parties."
        : "Двигатель передан в согласованном состоянии. Комплектация проверена сторонами.",
      footer: en
        ? "This waybill confirms the engine was handed over to the buyer."
        : "Накладная подтверждает факт передачи двигателя покупателю.",
    };
  }

  return base;
}

export function adaptWarrantyForMotorSale(
  warranty: ResolvedWarranty,
  locale?: DocumentContext["locale"],
): ResolvedWarranty {
  const en = isEnglishLocale(locale);
  if (en) {
    return {
      ...warranty,
      note: warranty.note || "Warranty covers the sold engine when operating conditions are met.",
    };
  }

  return {
    ...warranty,
    conditions: warranty.conditions.map((line) =>
      line
        .replace(/установки в сервисной книге автомобиля/gi, "продажи и передачи двигателя")
        .replace(/при установке/gi, "при продаже")
        .replace(/установк/gi, "продаж"),
    ),
    restrictions: warranty.restrictions.map((line) =>
      line.replace(/заказ-наряда/gi, "документа о продаже").replace(/заказ-наряд/gi, "документ о продаже"),
    ),
    note: warranty.note
      ? warranty.note
          .replace(/работы по установке/gi, "продажу двигателя")
          .replace(/установк/gi, "продаж")
      : "Гарантия распространяется на проданный двигатель при соблюдении условий эксплуатации.",
  };
}

export function hasMotorSaleBuyer(context: DocumentContext): boolean {
  const name = context.client?.fullName?.trim() || context.order.clientName?.trim();
  const phone = context.client?.phone?.trim() || context.order.clientPhone?.trim();
  return Boolean(name && name !== "—") || Boolean(phone && phone !== "—");
}
