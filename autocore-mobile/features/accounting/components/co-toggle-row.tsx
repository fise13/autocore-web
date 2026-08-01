import { View } from 'react-native';

import { Switch, Text } from '@/components/ui';
import { spacing } from '@/theme';

type CoToggleRowProps = {
  label: string;
  /** Explains the consequence of turning it on. */
  helper?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

/** Optional setting expressed as a switch — state is readable without tapping. */
export function CoToggleRow({ label, helper, value, onValueChange, disabled }: CoToggleRowProps) {
  return (
    <View
      style={{
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[4],
        paddingHorizontal: spacing[4],
        paddingVertical: spacing[3],
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="body" style={{ fontSize: 16, fontWeight: '600' }}>
          {label}
        </Text>
        {helper ? (
          <Text variant="caption" color="muted" style={{ fontSize: 13, lineHeight: 18 }}>
            {helper}
          </Text>
        ) : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} disabled={disabled} />
    </View>
  );
}
