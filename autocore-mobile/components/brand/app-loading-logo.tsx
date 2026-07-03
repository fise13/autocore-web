import { useEffect } from 'react';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion, useTheme } from '@/hooks';

import {
  AUTOCORE_LOGO_BRAND_RED,
  AUTOCORE_LOGO_INNER_LENGTH,
  AUTOCORE_LOGO_INNER_PATH,
  AUTOCORE_LOGO_OUTER_LENGTH,
  AUTOCORE_LOGO_OUTER_PATH,
} from './autocore-logo-mark-paths';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const DRAW_DURATION = 1400;
const DRAW_STAGGER = 90;
const easeInOut = Easing.bezier(0.45, 0, 0.55, 1);

type AppLoadingLogoProps = {
  size?: number;
};

function DrawablePath({
  d,
  length,
  strokeWidth,
  delay,
  color,
}: {
  d: string;
  length: number;
  strokeWidth: number;
  delay: number;
  color: string;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: DRAW_DURATION, easing: easeInOut }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      ),
    );
  }, [delay, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: length * (1 - progress.value),
    strokeDasharray: [length, length],
  }));

  return (
    <AnimatedPath
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      animatedProps={animatedProps}
    />
  );
}

function AppLoadingLogoStatic({ size }: { size: number }) {
  const { colors } = useTheme();

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="AutoCore">
      <Path d={`${AUTOCORE_LOGO_OUTER_PATH} Z`} fill={AUTOCORE_LOGO_BRAND_RED} />
      <Path d={`${AUTOCORE_LOGO_INNER_PATH} Z`} fill={colors.background} />
    </Svg>
  );
}

export function AppLoadingLogo({ size = 80 }: AppLoadingLogoProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <AppLoadingLogoStatic size={size} />;
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="AutoCore">
      <DrawablePath
        d={AUTOCORE_LOGO_OUTER_PATH}
        length={AUTOCORE_LOGO_OUTER_LENGTH}
        strokeWidth={4.25}
        delay={0}
        color={AUTOCORE_LOGO_BRAND_RED}
      />
      <DrawablePath
        d={AUTOCORE_LOGO_INNER_PATH}
        length={AUTOCORE_LOGO_INNER_LENGTH}
        strokeWidth={3.25}
        delay={DRAW_STAGGER}
        color={AUTOCORE_LOGO_BRAND_RED}
      />
    </Svg>
  );
}
