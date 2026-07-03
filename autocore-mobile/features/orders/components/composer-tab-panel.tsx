import type { ReactNode } from 'react';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks';

import type { ComposerTab } from '../animation/use-composer-tab-state';

type ComposerTabPanelProps = {
  tab: ComposerTab;
  direction: number;
  children: ReactNode;
};

function resolveEntering(direction: number, reduced: boolean) {
  if (reduced) return FadeIn.duration(0);
  if (direction > 0) {
    return SlideInRight.springify().damping(24).stiffness(380).duration(240);
  }
  if (direction < 0) {
    return SlideInLeft.springify().damping(24).stiffness(380).duration(240);
  }
  return FadeIn.duration(220);
}

function resolveExiting(direction: number, reduced: boolean) {
  if (reduced) return FadeOut.duration(0);
  if (direction > 0) return SlideOutLeft.duration(160);
  if (direction < 0) return SlideOutRight.duration(160);
  return FadeOut.duration(160);
}

export function ComposerTabPanel({ tab, direction, children }: ComposerTabPanelProps) {
  const reduced = useReducedMotion();

  return (
    <Animated.View
      key={tab}
      entering={resolveEntering(direction, reduced)}
      exiting={resolveExiting(direction, reduced)}
    >
      {children}
    </Animated.View>
  );
}
