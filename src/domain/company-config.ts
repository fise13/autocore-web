import { WarrantyTemplateId } from "@/domain/document-config";
import type { InventoryGroupId, InventorySubcategoryId } from "@/domain/inventory-taxonomy";
import { defaultKnowledgeFlags } from "@/domain/knowledge/flags";
import type { KnowledgeFlags } from "@/domain/knowledge/types";
import type { AppDisplayCurrency } from "@/lib/money/display-currency";

export type CompanyModuleKey = "motors" | "workOrders" | "accounting" | "warehouse" | "specifics";

export type SpecificCategoryMode = "tracked" | "quick";

export type CompanySpecificCategoryConfig = {
  id: string;
  name: string;
  mode: SpecificCategoryMode;
  groupId: InventoryGroupId;
  subcategoryId?: InventorySubcategoryId;
  warrantyDefault?: WarrantyTemplateId | "none";
};

export type CompanyAppConfig = {
  onboardingCompleted: boolean;
  businessImportCompleted?: boolean;
  modules: Record<CompanyModuleKey, boolean>;
  specificCategories: CompanySpecificCategoryConfig[];
  defaultWarrantyTemplate: WarrantyTemplateId | "no_warranty";
  taxonomyVersion?: number;
  /** Business Knowledge Engine feature flags — undefined key = enabled (gradual rollout). */
  knowledge?: KnowledgeFlags;
  /** Workspace display currency. Stored financial amounts remain USD. */
  displayCurrency?: AppDisplayCurrency;
  updatedAt?: Date;
};

export const DEFAULT_COMPANY_MODULES: Record<CompanyModuleKey, boolean> = {
  motors: true,
  workOrders: true,
  accounting: true,
  warehouse: false,
  specifics: true,
};

/** Canonical English names (US market). Locale-specific labels come from userCopy. */
export const SETUP_WIZARD_CATEGORY_PRESETS: CompanySpecificCategoryConfig[] = [
  { id: "gearboxes", name: "Transmissions", mode: "tracked", groupId: "aggregates", subcategoryId: "gearboxes" },
  { id: "turbos", name: "Turbos", mode: "tracked", groupId: "aggregates", subcategoryId: "turbos" },
  { id: "reducers", name: "Differentials", mode: "tracked", groupId: "aggregates", subcategoryId: "reducers" },
  {
    id: "transfer_cases",
    name: "Transfer cases",
    mode: "tracked",
    groupId: "aggregates",
    subcategoryId: "transfer_cases",
  },
  { id: "body", name: "Body", mode: "quick", groupId: "parts", subcategoryId: "body" },
  { id: "optics", name: "Lighting", mode: "quick", groupId: "parts", subcategoryId: "optics" },
  { id: "interior", name: "Interior", mode: "quick", groupId: "parts", subcategoryId: "interior" },
  { id: "suspension", name: "Suspension", mode: "quick", groupId: "parts", subcategoryId: "suspension" },
  {
    id: "electrical",
    name: "Electrical",
    mode: "quick",
    groupId: "parts",
    subcategoryId: "electrical",
    warrantyDefault: "contract_alternator",
  },
];

export function defaultCompanyAppConfig(): CompanyAppConfig {
  return {
    onboardingCompleted: false,
    modules: { ...DEFAULT_COMPANY_MODULES },
    specificCategories: SETUP_WIZARD_CATEGORY_PRESETS.filter((item) =>
      ["gearboxes", "body", "optics", "electrical"].includes(item.id),
    ).map((item) => ({ ...item })),
    defaultWarrantyTemplate: "contract_engine",
    taxonomyVersion: 2,
    knowledge: defaultKnowledgeFlags(),
    displayCurrency: "USD",
  };
}
