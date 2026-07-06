import { isProductionCompanyId, normalizeCompanyId } from '@/lib/company-id';
import type { CompanyAppConfig } from '@/types/company-config';
import type { UserCompanyMembership } from '@/types/rbac';
import type { UserEntity } from '@/types/user';
import type { WorkspaceAccessBlock } from '@/types/workspace-access';

type HydrationPayload = {
  profile: UserEntity | null;
  companyConfig: CompanyAppConfig | null;
  memberships: UserCompanyMembership[];
  activeCompanyName: string | null;
  workspaceBlock?: WorkspaceAccessBlock | null;
};

export type SessionHydrationPayload = HydrationPayload & {
  workspaceBlock: WorkspaceAccessBlock | null;
};

export function resolveSessionCompanyId(
  profile: UserEntity | null | undefined,
  memberships: UserCompanyMembership[],
): string | null {
  const fromProfile = profile?.companyId?.trim();
  if (isProductionCompanyId(fromProfile)) {
    return normalizeCompanyId(fromProfile);
  }

  const fromMembership = memberships.find((entry) => isProductionCompanyId(entry.companyId));
  return fromMembership ? normalizeCompanyId(fromMembership.companyId) : null;
}

export function hasEstablishedWorkspace(payload: HydrationPayload): boolean {
  return isProductionCompanyId(resolveSessionCompanyId(payload.profile, payload.memberships));
}

/** Never downgrade an established workspace when background enrich is partial. */
export function mergeSessionHydration(
  current: HydrationPayload,
  incoming: HydrationPayload,
): HydrationPayload {
  const existingCompanyId = resolveSessionCompanyId(current.profile, current.memberships);
  const incomingCompanyId = resolveSessionCompanyId(incoming.profile, incoming.memberships);
  const companyId = incomingCompanyId ?? existingCompanyId;

  const memberships =
    incoming.memberships.length > 0 ? incoming.memberships : current.memberships;

  const baseProfile = incoming.profile ?? current.profile;
  const profile =
    baseProfile && companyId
      ? { ...baseProfile, companyId }
      : baseProfile && existingCompanyId
        ? { ...baseProfile, companyId: existingCompanyId }
        : baseProfile;

  return {
    profile,
    companyConfig: incoming.companyConfig ?? current.companyConfig,
    memberships,
    activeCompanyName: incoming.activeCompanyName ?? current.activeCompanyName,
    workspaceBlock:
      incoming.workspaceBlock !== undefined
        ? incoming.workspaceBlock
        : (current.workspaceBlock ?? null),
  };
}
