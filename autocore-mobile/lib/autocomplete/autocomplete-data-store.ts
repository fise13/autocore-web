import { create } from 'zustand';

import type { ClientEntity } from '@/types/client';
import type { CompanyEmployee } from '@/types/rbac';
import type { InventoryItem } from '@/types/inventory';
import type { MotorEntity } from '@/types/motor';
import type { VehicleEntity } from '@/types/vehicle';
import type { FinancialOperation } from '@/types/financial-operation';
import type { CompanyAppConfig } from '@/types/company-config';
import type { WarehouseEntity } from '@/types/warehouse';

export type AutocompleteDataSnapshot = {
  companyId: string | null;
  clients: ClientEntity[];
  employees: CompanyEmployee[];
  inventory: InventoryItem[];
  motors: MotorEntity[];
  vehicles: VehicleEntity[];
  warehouses: WarehouseEntity[];
  specificCategories: CompanyAppConfig['specificCategories'];
  operationCategories: string[];
};

const EMPTY: AutocompleteDataSnapshot = {
  companyId: null,
  clients: [],
  employees: [],
  inventory: [],
  motors: [],
  vehicles: [],
  warehouses: [],
  specificCategories: [],
  operationCategories: [],
};

type AutocompleteDataStore = AutocompleteDataSnapshot & {
  setSnapshot: (patch: Partial<AutocompleteDataSnapshot>) => void;
  reset: () => void;
};

export const useAutocompleteDataStore = create<AutocompleteDataStore>((set) => ({
  ...EMPTY,
  setSnapshot: (patch) => set((state) => ({ ...state, ...patch })),
  reset: () => set(EMPTY),
}));

export function getAutocompleteDataSnapshot(): AutocompleteDataSnapshot {
  const state = useAutocompleteDataStore.getState();
  return {
    companyId: state.companyId,
    clients: state.clients,
    employees: state.employees,
    inventory: state.inventory,
    motors: state.motors,
    vehicles: state.vehicles,
    warehouses: state.warehouses,
    specificCategories: state.specificCategories,
    operationCategories: state.operationCategories,
  };
}
