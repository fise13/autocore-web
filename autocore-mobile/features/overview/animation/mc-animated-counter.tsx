import { useEffect, useRef } from 'react';
import { Text, type TextStyle, type StyleProp } from 'react-native';

export type McCounterFormat = 'integer' | 'grouped' | 'currency' | 'currency-rub';

export function formatGroupedInteger(value: number): string {
  return Math.round(Number.isFinite(value) ? value : 0)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function formatCounter(
  value: number,
  format: McCounterFormat,
  currencyPrefix: string,
  currencySuffix: string,
): string {
  const safe = Number.isFinite(value) ? value : 0;
  const rounded = Math.round(safe).toString();

  if (format === 'integer') {
    return rounded;
  }

  const grouped = rounded.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

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

/**
 * Tabular metric label.
 *
 * Plain `Text` only — never `TextInput` + Reanimated props. On iOS, ancestor
 * opacity/transform (tab enter, card enter, press) blanks animated TextInputs
 * while sibling chart bars keep painting — that looked like “Finance emptied”.
 */
export function McAnimatedCounter({
  value,
  format = 'grouped',
  currencyPrefix = '',
  currencySuffix = '',
  style,
}: McAnimatedCounterProps) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const text = formatCounter(safeValue, format, currencyPrefix, currencySuffix);

  return (
    <Text
      accessibilityRole="text"
      style={style}
    >
      {text}
    </Text>
  );
}
