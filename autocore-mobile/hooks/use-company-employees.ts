import { collection, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { getFirebaseDb, isFirebaseConfigured } from '@/services/firebase';
import type { UserRole } from '@/types/user';

export type CompanyEmployeeRow = {
  id: string;
  fullName: string | null;
  role: UserRole;
  isActive: boolean;
};

export function useCompanyEmployees(companyId: string | null | undefined) {
  const [employees, setEmployees] = useState<CompanyEmployeeRow[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(companyId));

  useEffect(() => {
    if (!companyId || !isFirebaseConfigured()) {
      setEmployees([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const ref = collection(getFirebaseDb(), 'companies', companyId, 'employees');
    return onSnapshot(
      ref,
      (snap) => {
        const rows = snap.docs.map((entry) => {
          const data = entry.data() as {
            fullName?: string;
            role?: UserRole;
            isActive?: boolean;
          };
          return {
            id: entry.id,
            fullName: data.fullName?.trim() || null,
            role: data.role ?? 'employee',
            isActive: data.isActive !== false,
          };
        });
        rows.sort((left, right) => {
          const leftName = left.fullName ?? left.id;
          const rightName = right.fullName ?? right.id;
          return leftName.localeCompare(rightName, 'ru');
        });
        setEmployees(rows);
        setIsLoading(false);
      },
      () => setIsLoading(false),
    );
  }, [companyId]);

  return { employees, isLoading };
}
