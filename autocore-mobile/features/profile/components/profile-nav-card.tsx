import type { ReactNode } from 'react';

import { ListGroup, ListRow } from '@/components/ui';

type ProfileNavCardProps = {
  title: string;
  subtitle?: string;
  value?: string;
  icon?: React.ComponentType<{ size?: 'sm' | 'md' | 'lg'; color?: string; strokeWidth?: number }>;
  tone?: 'default' | 'danger';
  showChevron?: boolean;
  onPress?: () => void;
};

export function ProfileNavCard(props: ProfileNavCardProps) {
  return <ListRow {...props} />;
}

type ProfileSettingsGroupProps = {
  children: ReactNode;
};

export function ProfileSettingsGroup({ children }: ProfileSettingsGroupProps) {
  return <ListGroup inset>{children}</ListGroup>;
}
