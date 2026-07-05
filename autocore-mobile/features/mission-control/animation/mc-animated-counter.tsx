import { useEffect, useRef } from 'react';
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

export type McCounterFormat = 'integer' | 'grouped' | 'currency' | 'currency-rub';

export function formatGroupedInteger(value: number): string {
  return Math.round(Number.isFinite(value) ? value : 0)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function formatCounterWorklet(
  value: number,
  format: McCounterFormat,
  currencyPrefix: string,
  currencySuffix: string,
): string {
  'worklet';
  const safe = Number.isFinite(value) ? value : 0;
  const rounded = Math.round(safe).toString();

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

  if (format === 'currency' || format === 'currency-rub') {
    const suffix = format === 'currency-rub' ? ' ₽' : currencySuffix;
    return `${currencyPrefix}${grouped}${suffix}`;
  }

  return grouped;
}

type McAnimatedCounterProps = {
  value: number;
  delay?: number;
  duration?: number;
  format?: McCounterFormat;
  currencyPrefix?: string;
  currencySuffix?: string;
  style?: StyleProp<TextStyle>;
};

export function McAnimatedCounter({
  value,
  delay = 0,
  duration = 500,
  format = 'grouped',
  currencyPrefix = '',
  currencySuffix = '',
  style,
}: McAnimatedCounterProps) {
  const reduced = useReducedMotion();
  const safeValue = Number.isFinite(value) ? value : 0;
  const displayValue = useSharedValue(reduced ? safeValue : 0);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    if (reduced) {
      displayValue.value = safeValue;
      return;
    }

    const enterDelay = hasAnimatedRef.current ? 0 : delay;
    hasAnimatedRef.current = true;

    displayValue.value = withDelay(
      enterDelay,
      withTiming(safeValue, { duration, easing: Easing.out(Easing.cubic) }),
    );
  }, [delay, displayValue, duration, reduced, safeValue]);

  const animatedProps = useAnimatedProps(() => {
    const text = formatCounterWorklet(displayValue.value, format, currencyPrefix, currencySuffix);
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
