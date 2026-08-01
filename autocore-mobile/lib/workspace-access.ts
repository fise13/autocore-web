import type { WorkspaceAccessBlock } from '@/types/workspace-access';

export type { WorkspaceAccessBlock };

export type WorkspaceAccessCopy = {
  title: string;
  description: string;
  hint?: string;
};

export function getWorkspaceAccessCopy(block: WorkspaceAccessBlock): WorkspaceAccessCopy {
  switch (block.kind) {
    case 'removed':
      return {
        title: `You were removed from "${block.companyName}"`,
        description:
          'An administrator disabled your access to this company. You can no longer work in its workspace.',
        hint: 'If you have access to another company, switch to it or join via a new invite.',
      };
    case 'deactivated':
      return {
        title: 'Access suspended',
        description: `Your access to "${block.companyName}" has been temporarily disabled by an administrator.`,
        hint: 'Contact the company owner or administrator to restore access.',
      };
    case 'no_company':
      return {
        title: 'No active company',
        description:
          "You're signed in, but you don't have a workspace yet. Create a company or join with an invite.",
        hint: 'Owners create a company. Teammates join with an invite code.',
      };
  }
}

export function resolveWorkspaceAccessBlock(params: {
  companyId: string | null;
  companyName: string | null;
  isCompanyOwner: boolean;
  employeeExists: boolean;
  employeeIsActive: boolean | null;
  membershipsCount: number;
}): WorkspaceAccessBlock | null {
  const { companyId, companyName, isCompanyOwner, employeeExists, employeeIsActive, membershipsCount } =
    params;

  if (!companyId) {
    return membershipsCount === 0 ? { kind: 'no_company' } : null;
  }

  if (!employeeExists && !isCompanyOwner) {
    return {
      kind: 'removed',
      companyId,
      companyName: companyName ?? companyId,
    };
  }

  if (employeeIsActive === false) {
    return {
      kind: 'deactivated',
      companyId,
      companyName: companyName ?? companyId,
    };
  }

  return null;
}
