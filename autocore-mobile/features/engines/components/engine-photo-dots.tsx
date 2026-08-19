import { View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks';
import { withAlpha } from '@/theme/color-utils';

const DOT = 6;
const ACTIVE_W = 18;

/**
 * Apple Photos-style page rail — inactive dots shrink, the active one stretches.
 */
export function EnginePhotoDots({
  count,
  scrollX,
  pageWidth,
  tone = 'default',
}: {
  count: number;
  scrollX: SharedValue<number>;
  pageWidth: number;
  /** Overlay sits on a photo; default sits on app background. */
  tone?: 'default' | 'overlay';
}) {
  const { colors, isDark } = useTheme();

  if (count < 2) return null;

  const active =
    tone === 'overlay'
      ? colors.primary
      : withAlpha(colors.foreground, isDark ? 0.95 : 0.88);

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`${count} photos`}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
    >
      {Array.from({ length: count }, (_, index) => (
        <EnginePhotoDot
          key={index}
          index={index}
          scrollX={scrollX}
          pageWidth={pageWidth}
          active={active}
        />
      ))}
    </View>
  );
}

function EnginePhotoDot({
  index,
  scrollX,
  pageWidth,
  active,
}: {
  index: number;
  scrollX: SharedValue<number>;
  pageWidth: number;
  active: string;
}) {
  const style = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * pageWidth, index * pageWidth, (index + 1) * pageWidth];
    const width = interpolate(
      scrollX.value,
      inputRange,
      [DOT, ACTIVE_W, DOT],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(scrollX.value, inputRange, [0.55, 1, 0.55], Extrapolation.CLAMP);
    return {
      width,
      height: DOT,
      borderRadius: DOT / 2,
      backgroundColor: active,
      opacity,
    };
  });

  return <Animated.View style={style} />;
}
