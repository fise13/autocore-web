import { CompanyAppConfig } from "@/domain/company-config";
import {
  DEFAULT_SIDEBAR_CUSTOMIZATION,
  SidebarCustomization,
  normalizeSidebarCustomization,
} from "@/lib/navigation/sidebar-customization";

export function applyCompanyModulesToSidebar(
  customization: SidebarCustomization,
  config: CompanyAppConfig | null | undefined,
): SidebarCustomization {
  if (!config) return customization;

  const modules = config.modules;
  const next = normalizeSidebarCustomization({
    ...customization,
    navItems: {
      ...customization.navItems,
      home: { enabled: true },
      motors: { enabled: modules.motors },
      sold: { enabled: modules.motors },
      work_orders: { enabled: modules.workOrders },
      accounting: { enabled: modules.accounting },
      warehouse: { enabled: modules.warehouse },
    },
    blocks: {
      ...customization.blocks,
      specific: { enabled: modules.specifics && config.specificCategories.length > 0 },
    },
  });

  return next;
}

export function sidebarFromCompanyConfig(config: CompanyAppConfig | null | undefined): SidebarCustomization {
  return applyCompanyModulesToSidebar(DEFAULT_SIDEBAR_CUSTOMIZATION, config);
}
