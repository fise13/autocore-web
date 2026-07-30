import { useAuthStore } from '@/store/auth-store';
import { useCompanyProfile } from '@/hooks/use-company-profile';
import { useSession } from '@/hooks/use-session';
import { resolveActiveCompanyName } from '@/lib/resolve-active-company-name';

export function useActiveCompanyName(fallback = 'Workspace') {
  const activeCompanyName = useAuthStore((s) => s.activeCompanyName);
  const memberships = useAuthStore((s) => s.memberships);
  const { companyId } = useSession();
  const { name: realtimeCompanyName, isLoading } = useCompanyProfile(companyId);

  const companyName = resolveActiveCompanyName(
    companyId,
    activeCompanyName,
    memberships,
    fallback,
    realtimeCompanyName,
  );

  return {
    companyName,
    isLoading: isLoading && companyName === fallback,
  };
}
