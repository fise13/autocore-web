import { WarrantyTemplateId, WarrantyTemplatePreset } from "@/domain/document-config";

export const WARRANTY_TEMPLATE_PRESETS: Record<WarrantyTemplateId, WarrantyTemplatePreset> = {
  contract_engine: {
    id: "contract_engine",
    name: "Контрактный двигатель",
    months: 6,
    km: 10_000,
    statusColor: "#059669",
    statusLabel: "Гарантия активна",
    conditions: [
      "Гарантия распространяется на контрактный двигатель при соблюдении регламента эксплуатации и обслуживания.",
      "Обязательна фиксация пробега и даты установки в сервисной книге автомобиля.",
      "Первые 1 000 км — щадящий режим эксплуатации без перегрузок.",
    ],
    restrictions: [
      "Гарантия не действует при механических повреждениях, перегреве, использовании некачественных ГСМ и масел.",
      "Претензии принимаются только при предъявлении гарантийного талона и заказ-наряда.",
    ],
  },
  contract_transmission: {
    id: "contract_transmission",
    name: "Контрактная АКПП",
    months: 3,
    km: 5_000,
    statusColor: "#2563eb",
    statusLabel: "Гарантия на КПП",
    conditions: [
      "Гарантия распространяется на контрактную коробку передач при корректной установке и обслуживании.",
      "Обязательна проверка уровня и состояния трансмиссионной жидкости после установки.",
    ],
    restrictions: [
      "Не распространяется на агрессивную езду, буксировку и эксплуатацию с перегревом.",
      "Самостоятельный ремонт или вмешательство третьих лиц аннулирует гарантию.",
    ],
  },
  contract_starter: {
    id: "contract_starter",
    name: "Контрактный стартер",
    months: 3,
    km: 8_000,
    statusColor: "#7c3aed",
    statusLabel: "Гарантия на стартер",
    conditions: ["Гарантия на контрактный стартер при установке в сертифицированном сервисе."],
    restrictions: ["Не распространяется на неправильную установку и КЗ электросистемы."],
  },
  contract_alternator: {
    id: "contract_alternator",
    name: "Контрактный генератор",
    months: 3,
    km: 8_000,
    statusColor: "#d97706",
    statusLabel: "Гарантия на генератор",
    conditions: ["Гарантия на контрактный генератор при корректном подключении и проверке зарядки."],
    restrictions: ["Не распространяется на скачки напряжения и неисправности бортовой сети."],
  },
  no_warranty: {
    id: "no_warranty",
    name: "Без гарантии",
    months: 0,
    km: 0,
    statusColor: "#6b7280",
    statusLabel: "Без гарантийных обязательств",
    conditions: ["Агрегат/работы переданы без гарантийных обязательств со стороны продавца/исполнителя."],
    restrictions: [],
  },
  custom: {
    id: "custom",
    name: "Своя гарантия",
    months: 6,
    km: 10_000,
    statusColor: "#111827",
    statusLabel: "Индивидуальные условия",
    conditions: [],
    restrictions: [],
  },
};

export function getWarrantyTemplate(id: WarrantyTemplateId | undefined): WarrantyTemplatePreset {
  return WARRANTY_TEMPLATE_PRESETS[id ?? "contract_engine"] ?? WARRANTY_TEMPLATE_PRESETS.contract_engine;
}
