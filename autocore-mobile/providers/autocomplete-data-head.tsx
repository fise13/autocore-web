import { useEffect, useMemo } from 'react';

import { useClientsRealtime } from '@/hooks/use-clients-realtime';
import { useCompanyAppConfig } from '@/hooks/use-company-app-config';
import { useEmployeesRealtime } from '@/hooks/use-employees-realtime';
import { useInventoryCatalog } from '@/hooks/use-inventory-catalog';
import { useMotorsRealtime } from '@/hooks/use-motors-realtime';
import { useOperationsRealtime } from '@/hooks/use-operations-realtime';
import { useSession } from '@/hooks/use-session';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';
import { useVehiclesRealtime } from '@/hooks/use-vehicles-realtime';
import { useWarehousesRealtime } from '@/hooks/use-warehouses-realtime';
import { useAutocompleteDataStore } from '@/lib/autocomplete/autocomplete-data-store';
import { isProductionCompanyId } from '@/lib/company-id';

export function AutocompleteDataHead() {
  const { companyId, uid } = useSession();
  const rbac = useRbacPolicy();
  const setSnapshot = useAutocompleteDataStore((state) => state.setSnapshot);
  const reset = useAutocompleteDataStore((state) => state.reset);

  const active = isProductionCompanyId(companyId);

  const { clients } = useClientsRealtime(active && rbac.shouldSubscribe('clients') ? companyId : null, {
    keepAlive: true,
  });
  const { items: inventory } = useInventoryCatalog(
    active && rbac.shouldSubscribe('inventory') ? companyId : null,
    { keepAlive: true },
  );
  const { motors } = useMotorsRealtime(
    active && rbac.shouldSubscribe('motors') ? companyId : null,
    uid,
    rbac.shouldSubscribe('motors'),
    { keepAlive: true },
  );
  const { vehicles } = useVehiclesRealtime(active && rbac.shouldSubscribe('vehicles') ? companyId : null, {
    keepAlive: true,
  });
  const { employees } = useEmployeesRealtime(
    active && rbac.shouldSubscribe('employees') ? companyId : null,
    rbac.shouldSubscribe('employees'),
    { keepAlive: true },
  );
  const { warehouses } = useWarehousesRealtime(
    active && rbac.shouldSubscribe('inventory') ? companyId : null,
    { keepAlive: true },
  );
  const { config } = useCompanyAppConfig(active ? companyId : null, { keepAlive: true });
  const { operations } = useOperationsRealtime(
    active && rbac.shouldSubscribe('accounting') ? companyId : null,
    { keepAlive: true },
  );

  const operationCategories = useMemo(() => {
    const values = new Set<string>();
    for (const operation of operations) {
      if (operation.category?.trim()) values.add(operation.category.trim());
      if (operation.description?.trim()) values.add(operation.description.trim());
      if (operation.comment?.trim()) values.add(operation.comment.trim());
    }
    return [...values];
  }, [operations]);

  useEffect(() => {
    if (!active || !companyId) {
      reset();
      return;
    }

    setSnapshot({
      companyId,
      clients,
      employees,
      inventory,
      motors,
      vehicles,
      warehouses,
      specificCategories: config?.specificCategories ?? [],
      operationCategories,
    });
  }, [
    active,
    clients,
    companyId,
    config?.specificCategories,
    employees,
    inventory,
    motors,
    operationCategories,
    reset,
    setSnapshot,
    vehicles,
    warehouses,
  ]);

  return null;
}
