import { useMemo } from 'react';

import { useAuthStore } from '@/store/auth-store';
import { useSession } from '@/hooks/use-session';

import { resolveShellModel } from './workspace-registry';
import { useWorkspaceContextStore } from './workspace-context-store';

/** Company config + role → Home / Work / Action / AI surface model. */
export function useShellModel() {
  const { profile } = useSession();
  const companyConfig = useAuthStore((s) => s.companyConfig);
  const workspaceContext = useWorkspaceContextStore((s) => s.workspaceContext);

  return useMemo(
    () =>
      resolveShellModel({
        modules: companyConfig?.modules,
        user: profile,
        workspaceContext,
      }),
    [companyConfig?.modules, profile, workspaceContext],
  );
}
