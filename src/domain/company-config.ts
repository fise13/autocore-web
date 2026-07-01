import { WarrantyTemplateId } from "@/domain/document-config";
import type { InventoryGroupId, InventorySubcategoryId } from "@/domain/inventory-taxonomy";

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
  modules: Record<CompanyModuleKey, boolean>;
  specificCategories: CompanySpecificCategoryConfig[];
  defaultWarrantyTemplate: WarrantyTemplateId | "no_warranty";
  taxonomyVersion?: number;
  updatedAt?: Date;
};

export const DEFAULT_COMPANY_MODULES: Record<CompanyModuleKey, boolean> = {
  motors: true,
  workOrders: true,
  accounting: true,
  warehouse: false,
  specifics: true,
};

export const SETUP_WIZARD_CATEGORY_PRESETS: CompanySpecificCategoryConfig[] = [
  { id: "gearboxes", name: "КПП", mode: "tracked", groupId: "aggregates", subcategoryId: "gearboxes" },
  { id: "body", name: "Кузовщина", mode: "quick", groupId: "parts", subcategoryId: "body" },
  { id: "optics", name: "Оптика", mode: "quick", groupId: "parts", subcategoryId: "optics" },
  { id: "interior", name: "Салон", mode: "quick", groupId: "parts", subcategoryId: "interior" },
  { id: "suspension", name: "Подвеска", mode: "quick", groupId: "parts", subcategoryId: "suspension" },
  {
    id: "electrical",
    name: "Электрика",
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
    ),
    defaultWarrantyTemplate: "contract_engine",
    taxonomyVersion: 2,
  };
}
