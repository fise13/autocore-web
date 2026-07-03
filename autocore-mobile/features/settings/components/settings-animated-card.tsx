import type { ReactNode } from 'react';
import Animated from 'react-native-reanimated';

import { useProfileEnter } from '@/features/profile/animation/use-profile-enter';

type SettingsAnimatedCardProps = {
  children: ReactNode;
  delay?: number;
};

export function SettingsAnimatedCard({ children, delay = 0 }: SettingsAnimatedCardProps) {
  const style = useProfileEnter({ delay, translateY: 12, duration: 340 });
  return <Animated.View style={[{ gap: 0 }, style]}>{children}</Animated.View>;
}
