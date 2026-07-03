import { View } from 'react-native';

import { Switch, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics } from '@/theme';

import { settingsLayout } from '../layout';

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
        minHeight: subtitle ? 68 : settingsLayout.rowMinHeight,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: subtitle ? 12 : 10,
      }}
    >
      <View style={{ flex: 1, gap: subtitle ? 4 : 0 }}>
        <Text variant="body" style={{ fontSize: 15, fontWeight: '600', letterSpacing: -0.1 }}>
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
        borderRadius: 999,
        backgroundColor: active ? colors.primary : colors.muted,
      }}
    >
      <Text
        variant="caption"
        style={{ fontWeight: '600', color: active ? colors.primaryForeground : colors.foreground }}
      >
        {label}
      </Text>
    </View>
  );
}
