import { WarrantyTemplateId, WarrantyTemplatePreset } from "@/domain/document-config";
import { userCopy } from "@/lib/user-copy";

const WARRANTY_TEMPLATE_BASE: Record<
  WarrantyTemplateId,
  Pick<WarrantyTemplatePreset, "id" | "days" | "km" | "statusColor">
> = {
  contract_engine: {
    id: "contract_engine",
    days: 180,
    km: 10_000,
    statusColor: "#059669",
  },
  contract_transmission: {
    id: "contract_transmission",
    days: 90,
    km: 5_000,
    statusColor: "#2563eb",
  },
  contract_starter: {
    id: "contract_starter",
    days: 90,
    km: 8_000,
    statusColor: "#7c3aed",
  },
  contract_alternator: {
    id: "contract_alternator",
    days: 90,
    km: 8_000,
    statusColor: "#d97706",
  },
  no_warranty: {
    id: "no_warranty",
    days: 0,
    km: 0,
    statusColor: "#6b7280",
  },
  custom: {
    id: "custom",
    days: 180,
    km: 10_000,
    statusColor: "#111827",
  },
};

function localizedPreset(id: WarrantyTemplateId): WarrantyTemplatePreset {
  const base = WARRANTY_TEMPLATE_BASE[id];
  const copy = userCopy.documents.warrantyPresets[id];
  return {
    ...base,
    name: copy.name,
    statusLabel: copy.statusLabel,
    conditions: [...copy.conditions],
    restrictions: [...copy.restrictions],
  };
}

/** Locale-aware warranty presets via `userCopy.documents.warrantyPresets`. */
export const WARRANTY_TEMPLATE_PRESETS: Record<WarrantyTemplateId, WarrantyTemplatePreset> = {
  get contract_engine() {
    return localizedPreset("contract_engine");
  },
  get contract_transmission() {
    return localizedPreset("contract_transmission");
  },
  get contract_starter() {
    return localizedPreset("contract_starter");
  },
  get contract_alternator() {
    return localizedPreset("contract_alternator");
  },
  get no_warranty() {
    return localizedPreset("no_warranty");
  },
  get custom() {
    return localizedPreset("custom");
  },
};

export function getWarrantyTemplate(id: WarrantyTemplateId | undefined): WarrantyTemplatePreset {
  return WARRANTY_TEMPLATE_PRESETS[id ?? "contract_engine"] ?? WARRANTY_TEMPLATE_PRESETS.contract_engine;
}
