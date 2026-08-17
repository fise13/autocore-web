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
  // Both hooks run on every render. Picking between them at the call site made
  // the hook order depend on whether `staggerIndex` was passed, so a container
  // that gained or lost the prop between renders desynced React's hook list.
  const staggered = useStaggerFadeIn(staggerIndex ?? 0, staggerMs);
  const faded = useFadeIn(delay);
  const animation = staggerIndex !== undefined ? staggered : faded;

  return (
    <Animated.View style={[animation.style, style]} {...(props as AnimatedProps<ViewProps>)}>
      {children}
    </Animated.View>
  );
}
