import { memo, type ReactNode } from 'react';
import { View } from 'react-native';

type AnimatedTabScreenProps = {
  tab?: string;
  children: ReactNode;
};

/**
 * Tab shell — no opacity/transform enter.
 * Parent opacity was blanking nested Reanimated/text and delaying taps.
 */
export const AnimatedTabScreen = memo(function AnimatedTabScreen({
  children,
}: AnimatedTabScreenProps) {
  return <View style={{ flex: 1 }}>{children}</View>;
});

/** Static shell for screens that should paint immediately with zero tab motion cost. */
export const StaticTabScreen = memo(function StaticTabScreen({
  children,
}: {
  children: ReactNode;
}) {
  return <View style={{ flex: 1 }}>{children}</View>;
});
