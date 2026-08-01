import type { ReactNode } from 'react';
import type { ScrollViewProps } from 'react-native';
import type { Href } from 'expo-router';

import { StackScreen } from '@/components/ui';

type ProfileScreenShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  refreshControl?: ScrollViewProps['refreshControl'];
  backFallbackHref?: Href;
  onBack?: () => void;
  headerAction?: ReactNode;
};

/** @deprecated Prefer StackScreen from design system — kept as alias for feature imports. */
export function ProfileScreenShell({
  title,
  subtitle,
  children,
  refreshControl,
  backFallbackHref,
  onBack,
  headerAction,
}: ProfileScreenShellProps) {
  return (
    <StackScreen
      title={title}
      subtitle={subtitle}
      refreshControl={refreshControl}
      backFallbackHref={backFallbackHref}
      onBack={onBack}
      headerAction={headerAction}
    >
      {children}
    </StackScreen>
  );
}
