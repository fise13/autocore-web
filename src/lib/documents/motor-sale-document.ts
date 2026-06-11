import { DocumentContext } from "@/lib/documents/document-context";
import { DocumentSlug } from "@/lib/documents/document-types";
import { DocumentTemplateMeta } from "@/lib/documents/templates/document-template-meta";
import { ResolvedWarranty } from "@/lib/documents/warranty/resolve-warranty";
import { documentPrimaryMotor } from "@/lib/documents/document-helpers";

/** Standalone motor sale: sold engine without work-order labor/parts. */
export function isStandaloneMotorSale(context: DocumentContext): boolean {
  const motor = documentPrimaryMotor(context);
  if (!motor || motor.outcome !== "sell") return false;
  if (context.order.laborLines.length > 0) return false;
  if (context.order.partLines.length > 0) return false;
  return true;
}

export function formatMotorSaleDocumentLabel(context: DocumentContext): string {
  const motor = documentPrimaryMotor(context);
  const label = [motor?.brandName, motor?.engineCode, motor?.serialCode].filter(Boolean).join(" · ");
  return label ? `Продажа двигателя · ${label}` : "Продажа двигателя";
}

export function motorSaleDocumentMeta(
  slug: DocumentSlug,
  base: DocumentTemplateMeta,
): DocumentTemplateMeta {
  if (slug === "engine-warranty") {
    return {
      ...base,
      title: "Гарантийный талон на двигатель",
      tag: "Гарантия",
      lead: "Подтверждение продажи контрактного двигателя и условий гарантийного обслуживания.",
      primaryLabel: "Срок гарантии",
      warrantyBlock:
        "Гарантия не распространяется на естественный износ, нарушение эксплуатации и внешние повреждения.",
      footer: "Документ подтверждает гарантийные обязательства продавца. Сохраните для предъявления претензий.",
    };
  }

  if (slug === "invoice") {
    return {
      ...base,
      title: "Счёт на оплату двигателя",
      tag: "Счёт",
      lead: "Счёт на оплату контрактного двигателя. Состав и стоимость указаны ниже.",
      primaryLabel: "Сумма счёта",
      warrantyBlock: "",
      footer: "Счёт сформирован автоматически. Назначение платежа: оплата контрактного двигателя.",
      disclaimer:
        "Счёт действителен 5 рабочих дней. Оплата подтверждает согласие с комплектацией и стоимостью двигателя.",
    };
  }

  if (slug === "engine-waybill") {
    return {
      ...base,
      title: "Накладная на двигатель",
      tag: "Передача",
      lead: "Документ подтверждает передачу двигателя покупателю: комплектацию, состояние и стоимость.",
      primaryLabel: "Стоимость",
      disclaimer: "Двигатель передан в согласованном состоянии. Комплектация проверена сторонами.",
      footer: "Накладная подтверждает факт передачи двигателя покупателю.",
    };
  }

  return base;
}

export function adaptWarrantyForMotorSale(warranty: ResolvedWarranty): ResolvedWarranty {
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
