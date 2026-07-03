import { useAuth } from '@/authentication/auth-provider';
import { useCompanyProfile } from '@/hooks/use-company-profile';
import { useSession } from '@/hooks/use-session';
import { resolveActiveCompanyName } from '@/lib/resolve-active-company-name';

export function useActiveCompanyName(fallback = 'Рабочее пространство') {
  const { activeCompanyName, memberships } = useAuth();
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
