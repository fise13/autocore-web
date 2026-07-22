import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/hooks/use-session';
import { useAutocompleteDataStore } from '@/lib/autocomplete/autocomplete-data-store';
import { isProductionCompanyId } from '@/lib/company-id';
import type { ClientEntity } from '@/types/client';
import type { CompanyAppConfig } from '@/types/company-config';
import type { CompanyEmployee } from '@/types/rbac';
import type { FinancialOperation } from '@/types/financial-operation';
import type { InventoryItem } from '@/types/inventory';
import type { MotorEntity } from '@/types/motor';
import type { VehicleEntity } from '@/types/vehicle';
import type { WarehouseEntity } from '@/types/warehouse';

const SNAPSHOT_DEBOUNCE_MS = 500;
const MAX_OPERATION_CATEGORY_SCAN = 400;

function extractOperationCategories(operations: FinancialOperation[]): string[] {
  const values = new Set<string>();
  const limit = Math.min(operations.length, MAX_OPERATION_CATEGORY_SCAN);
  for (let i = 0; i < limit; i += 1) {
    const operation = operations[i];
    if (operation.category?.trim()) values.add(operation.category.trim());
    if (operation.description?.trim()) values.add(operation.description.trim());
    if (operation.comment?.trim()) values.add(operation.comment.trim());
  }
  return [...values];
}

function useCachedRealtime<T>(queryKey: readonly unknown[], enabled: boolean, fallback: T): T {
  const queryClient = useQueryClient();
  const { data } = useQuery<T>({
    queryKey,
    enabled,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
    queryFn: async () => (queryClient.getQueryData<T>(queryKey) as T | undefined) ?? fallback,
    initialData: () => queryClient.getQueryData<T>(queryKey) ?? fallback,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  return (data ?? fallback) as T;
}

/**
 * Mirrors session catalogs into the autocomplete store.
 * Reads React Query cache only — does not open extra Firestore listeners.
 */
export function AutocompleteDataHead() {
  const queryClient = useQueryClient();
  const { companyId, uid } = useSession();
  const setSnapshot = useAutocompleteDataStore((state) => state.setSnapshot);
  const reset = useAutocompleteDataStore((state) => state.reset);

  const active = isProductionCompanyId(companyId);
  const enabled = Boolean(active && companyId);

  const clients = useCachedRealtime<ClientEntity[]>(
    ['realtime', 'clients', companyId],
    enabled,
    [],
  );
  const inventory = useCachedRealtime<InventoryItem[]>(
    ['realtime', 'inventory-items', companyId],
    enabled,
    [],
  );
  const motors = useCachedRealtime<MotorEntity[]>(
    ['realtime', 'motors', companyId, uid],
    enabled && Boolean(uid),
    [],
  );
  const vehicles = useCachedRealtime<VehicleEntity[]>(
    ['realtime', 'vehicles', companyId],
    enabled,
    [],
  );
  const employees = useCachedRealtime<CompanyEmployee[]>(
    ['realtime', 'employees', companyId],
    enabled,
    [],
  );
  const warehouses = useCachedRealtime<WarehouseEntity[]>(
    ['realtime', 'warehouses', companyId],
    enabled,
    [],
  );
  const config = useCachedRealtime<CompanyAppConfig | null>(
    ['realtime', 'company-app-config', companyId],
    enabled,
    null,
  );

  const latestRef = useRef({
    clients,
    inventory,
    motors,
    vehicles,
    employees,
    warehouses,
    specificCategories: config?.specificCategories ?? [],
  });
  latestRef.current = {
    clients,
    inventory,
    motors,
    vehicles,
    employees,
    warehouses,
    specificCategories: config?.specificCategories ?? [],
  };

  useEffect(() => {
    if (!active || !companyId) {
      reset();
      return;
    }

    const timer = setTimeout(() => {
      const latest = latestRef.current;
      const operations =
        queryClient.getQueryData<FinancialOperation[]>([
          'realtime',
          'financial-operations',
          companyId,
        ]) ?? [];

      setSnapshot({
        companyId,
        clients: latest.clients,
        employees: latest.employees,
        inventory: latest.inventory,
        motors: latest.motors,
        vehicles: latest.vehicles,
        warehouses: latest.warehouses,
        specificCategories: latest.specificCategories,
        operationCategories: extractOperationCategories(operations),
      });
    }, SNAPSHOT_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [
    active,
    clients,
    companyId,
    config?.specificCategories,
    employees,
    inventory,
    motors,
    queryClient,
    reset,
    setSnapshot,
    vehicles,
    warehouses,
  ]);

  return null;
}
