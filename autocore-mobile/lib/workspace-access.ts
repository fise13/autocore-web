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
        title: `Вас удалили из «${block.companyName}»`,
        description:
          'Администратор отключил ваш доступ к этой компании. Вы больше не можете работать в её рабочем пространстве.',
        hint: 'Если у вас есть доступ к другой компании, переключитесь на неё или присоединитесь по новому приглашению.',
      };
    case 'deactivated':
      return {
        title: 'Доступ приостановлен',
        description: `Ваш доступ к «${block.companyName}» временно отключён администратором.`,
        hint: 'Обратитесь к владельцу или администратору компании, чтобы восстановить доступ.',
      };
    case 'no_company':
      return {
        title: 'Нет активной компании',
        description:
          'Аккаунт вошёл успешно, но рабочее пространство ещё не выбрано. Присоединитесь по приглашению или выберите компанию.',
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
