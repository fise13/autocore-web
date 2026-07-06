import type { ReactNode } from 'react';

import { useRbacPolicy } from '@/hooks/use-rbac-policy';
import type { Permission } from '@/types/user';

type CanProps = {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
};

export function Can({ permission, children, fallback = null }: CanProps) {
  const { can } = useRbacPolicy();
  if (!can(permission)) return <>{fallback}</>;
  return <>{children}</>;
}

type RequirePermissionProps = {
  permission: Permission;
  children: ReactNode;
  denied?: ReactNode;
};

export function RequirePermission({ permission, children, denied = null }: RequirePermissionProps) {
  const { can, isActive } = useRbacPolicy();
  if (!isActive || !can(permission)) return <>{denied}</>;
  return <>{children}</>;
}
