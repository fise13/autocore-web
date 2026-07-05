import type { ReactNode } from 'react';
import { View } from 'react-native';

type SettingsAnimatedCardProps = {
  children: ReactNode;
  delay?: number;
};

/** Passthrough — settings stay static like web. */
export function SettingsAnimatedCard({ children }: SettingsAnimatedCardProps) {
  return <View>{children}</View>;
}
