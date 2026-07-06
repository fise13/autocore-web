import { useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';

import { isProductionCompanyId, normalizeCompanyId } from '@/lib/company-id';
import { resolveWorkspaceAccessBlock } from '@/lib/workspace-access';
import { getFirebaseDb } from '@/services/firebase';
import { useAuthStore } from '@/store/auth-store';

/**
 * Detects mid-session removal or deactivation from the active company.
 */
export function useWorkspaceAccessRealtime(enabled: boolean): void {
  const profile = useAuthStore((s) => s.profile);
  const memberships = useAuthStore((s) => s.memberships);
  const activeCompanyName = useAuthStore((s) => s.activeCompanyName);
  const firebaseUser = useAuthStore((s) => s.firebaseUser);

  useEffect(() => {
    if (!enabled || !firebaseUser || !isProductionCompanyId(profile?.companyId)) {
      return;
    }

    const companyId = normalizeCompanyId(profile!.companyId!);
    const employeeRef = doc(getFirebaseDb(), 'companies', companyId, 'employees', firebaseUser.uid);

    return onSnapshot(
      employeeRef,
      (snapshot) => {
        const workspaceBlock = resolveWorkspaceAccessBlock({
          companyId,
          companyName: activeCompanyName,
          isCompanyOwner: profile?.isCompanyOwner === true,
          employeeExists: snapshot.exists(),
          employeeIsActive: snapshot.exists() ? snapshot.data()?.isActive !== false : null,
          membershipsCount: memberships.length,
        });
        useAuthStore.getState().setWorkspaceBlock(workspaceBlock);
      },
      () => {
        // Ignore listener errors; hydration will reconcile on next refresh.
      },
    );
  }, [
    activeCompanyName,
    enabled,
    firebaseUser,
    memberships.length,
    profile?.companyId,
    profile?.isCompanyOwner,
  ]);
}
