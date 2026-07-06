import type { ReactNode } from 'react';
import type { ScrollViewProps } from 'react-native';

import { StackScreen } from '@/components/ui';

type ProfileScreenShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  refreshControl?: ScrollViewProps['refreshControl'];
};

/** @deprecated Prefer StackScreen from design system — kept as alias for feature imports. */
export function ProfileScreenShell({
  title,
  subtitle,
  children,
  refreshControl,
}: ProfileScreenShellProps) {
  return (
    <StackScreen title={title} subtitle={subtitle} refreshControl={refreshControl}>
      {children}
    </StackScreen>
  );
}
