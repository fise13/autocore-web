import type { ReactNode } from 'react';

import { StackScreen } from '@/components/ui';

type ProfileScreenShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

/** @deprecated Prefer StackScreen from design system — kept as alias for feature imports. */
export function ProfileScreenShell({ title, subtitle, children }: ProfileScreenShellProps) {
  return (
    <StackScreen title={title} subtitle={subtitle}>
      {children}
    </StackScreen>
  );
}
