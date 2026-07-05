import { View } from 'react-native';

import { rhythm } from '@/theme';

import { Text } from './text';

type MetaRowProps = {
  label: string;
  value: string;
  hint?: string;
};

/** Label / value pair used in settings and profile cards. */
export function MetaRow({ label, value, hint }: MetaRowProps) {
  return (
    <View style={{ gap: rhythm.micro }}>
      <Text variant="meta" color="muted" style={{ fontWeight: '500' }}>
        {label}
      </Text>
      <Text variant="bodyStrong" style={{ fontSize: rhythm.valueStrong }}>
        {value}
      </Text>
      {hint ? (
        <Text variant="caption" color="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
