import { WarrantyTemplateId } from "@/domain/document-config";

export type CompanyModuleKey = "motors" | "workOrders" | "accounting" | "warehouse" | "specifics";

export type SpecificCategoryMode = "tracked" | "quick";

export type CompanySpecificCategoryConfig = {
  id: string;
  name: string;
  mode: SpecificCategoryMode;
  warrantyDefault?: WarrantyTemplateId | "none";
};

export type CompanyAppConfig = {
  onboardingCompleted: boolean;
  modules: Record<CompanyModuleKey, boolean>;
  specificCategories: CompanySpecificCategoryConfig[];
  defaultWarrantyTemplate: WarrantyTemplateId | "no_warranty";
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
  { id: "gearboxes", name: "Коробки", mode: "tracked" },
  { id: "transfer_cases", name: "Раздатки", mode: "tracked" },
  { id: "ecu", name: "ЭБУ", mode: "tracked" },
  { id: "turbos", name: "Турбины", mode: "tracked" },
  { id: "alternators", name: "Генераторы", mode: "quick", warrantyDefault: "contract_alternator" },
  { id: "starters", name: "Стартеры", mode: "quick", warrantyDefault: "contract_starter" },
  { id: "pumps", name: "Насосы", mode: "quick" },
  { id: "bumpers", name: "Бамперы", mode: "quick" },
  { id: "headlights", name: "Фары", mode: "quick" },
  { id: "fenders", name: "Крылья", mode: "quick" },
];

export function defaultCompanyAppConfig(): CompanyAppConfig {
  return {
    onboardingCompleted: false,
    modules: { ...DEFAULT_COMPANY_MODULES },
    specificCategories: SETUP_WIZARD_CATEGORY_PRESETS.filter((item) =>
      ["gearboxes", "transfer_cases", "alternators", "bumpers"].includes(item.id),
    ),
    defaultWarrantyTemplate: "contract_engine",
  };
}
