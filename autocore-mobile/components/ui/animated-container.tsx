import Animated, { type AnimatedProps } from 'react-native-reanimated';
import { type ViewProps } from 'react-native';

import { useFadeIn, useStaggerFadeIn } from '@/animations';

type AnimatedContainerProps = ViewProps & {
  delay?: number;
  staggerIndex?: number;
  staggerMs?: number;
};

export function AnimatedContainer({
  children,
  delay = 0,
  staggerIndex,
  staggerMs = 55,
  style,
  ...props
}: AnimatedContainerProps) {
  const animation =
    staggerIndex !== undefined
      ? useStaggerFadeIn(staggerIndex, staggerMs)
      : useFadeIn(delay);

  return (
    <Animated.View style={[animation.style, style]} {...(props as AnimatedProps<ViewProps>)}>
      {children}
    </Animated.View>
  );
}
