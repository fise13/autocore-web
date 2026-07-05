import { View } from 'react-native';

import { Switch, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';

type SettingsToggleRowProps = {
  label: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

export function SettingsToggleRow({ label, subtitle, value, onValueChange, disabled }: SettingsToggleRowProps) {
  return (
    <View
      style={{
        minHeight: subtitle ? 52 : 48,
        flexDirection: 'row',
        alignItems: 'center',
        gap: rhythm.inline,
        paddingVertical: subtitle ? 8 : 4,
      }}
    >
      <View style={{ flex: 1, gap: subtitle ? 2 : 0 }}>
        <Text variant="body" style={{ fontSize: 15, fontWeight: '500' }}>
          {label}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="muted" style={{ lineHeight: 17 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={(next) => {
          haptics.selection();
          onValueChange(next);
        }}
      />
    </View>
  );
}

type SettingsChipProps = {
  label: string;
  active?: boolean;
};

export function SettingsChip({ label, active }: SettingsChipProps) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? `${colors.primary}14` : 'transparent',
      }}
    >
      <Text
        variant="caption"
        style={{ fontWeight: '600', color: active ? colors.primary : colors.mutedForeground }}
      >
        {label}
      </Text>
    </View>
  );
}
