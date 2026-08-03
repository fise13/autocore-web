import type { CompanyModuleKey } from '@/types/company-config';
import { useAuthStore } from '@/store/auth-store';
import { MODULE_DEFINITIONS } from '@/features/settings/data/modules';
import { useModulesConfigStore } from '@/features/settings/store/modules-config-store';
import type { ProductModuleId } from '@/features/settings/types';

export function useModuleEnabled(module: CompanyModuleKey): boolean {
  const companyConfig = useAuthStore((s) => s.companyConfig);
  if (!companyConfig) return true;
  return companyConfig.modules[module] !== false;
}

const MODULE_KEY_TO_PRODUCT: Partial<Record<CompanyModuleKey, ProductModuleId>> = {
  motors: 'engines',
  workOrders: 'orders',
  warehouse: 'warehouse',
  accounting: 'accounting',
  specifics: 'parts',
};

export function useProductModuleEnabled(moduleId: ProductModuleId): boolean {
  const storeEnabled = useModulesConfigStore((state) => state.enabled[moduleId] !== false);
  const definition = MODULE_DEFINITIONS[moduleId];
  const companyConfig = useAuthStore((s) => s.companyConfig);

  if (!storeEnabled) return false;

  if (!definition.companyModuleKey) return true;
  if (!companyConfig) return true;
  return companyConfig.modules[definition.companyModuleKey] !== false;
}

export function useCompanyModuleEnabled(module: CompanyModuleKey): boolean {
  const productId = MODULE_KEY_TO_PRODUCT[module];
  // Same hooks every render — never call hooks behind a branch.
  const storeMap = useModulesConfigStore((state) => state.enabled);
  const companyConfig = useAuthStore((s) => s.companyConfig);

  if (!productId) {
    if (!companyConfig) return true;
    return companyConfig.modules[module] !== false;
  }

  if (storeMap[productId] === false) return false;
  const definition = MODULE_DEFINITIONS[productId];
  if (!definition.companyModuleKey) return true;
  if (!companyConfig) return true;
  return companyConfig.modules[definition.companyModuleKey] !== false;
}
