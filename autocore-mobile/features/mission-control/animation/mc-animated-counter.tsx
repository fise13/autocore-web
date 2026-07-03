import { useEffect } from 'react';
import { TextInput, type TextStyle, type StyleProp } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export type McCounterFormat = 'integer' | 'grouped' | 'currency-rub';

export function formatGroupedInteger(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function formatCounterWorklet(value: number, format: McCounterFormat): string {
  'worklet';
  const rounded = Math.round(value).toString();

  if (format === 'integer') {
    return rounded;
  }

  const chars = rounded.split('');
  let grouped = '';
  let count = 0;

  for (let i = chars.length - 1; i >= 0; i -= 1) {
    grouped = chars[i] + grouped;
    count += 1;
    if (count === 3 && i > 0) {
      grouped = ` ${grouped}`;
      count = 0;
    }
  }

  return format === 'currency-rub' ? `${grouped} ₽` : grouped;
}

type McAnimatedCounterProps = {
  value: number;
  delay?: number;
  duration?: number;
  format?: McCounterFormat;
  style?: StyleProp<TextStyle>;
};

export function McAnimatedCounter({
  value,
  delay = 0,
  duration = 500,
  format = 'grouped',
  style,
}: McAnimatedCounterProps) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(
      delay,
      withTiming(1, { duration, easing: Easing.out(Easing.cubic) }),
    );
  }, [delay, duration, progress, reduced]);

  const animatedProps = useAnimatedProps(() => {
    const current = progress.value * value;
    const text = formatCounterWorklet(current, format);
    return { text, defaultValue: text };
  });

  return (
    <AnimatedTextInput
      editable={false}
      pointerEvents="none"
      underlineColorAndroid="transparent"
      animatedProps={animatedProps}
      style={[
        style,
        {
          padding: 0,
          margin: 0,
          borderWidth: 0,
          backgroundColor: 'transparent',
        },
      ]}
    />
  );
}
