import { Pressable, View } from 'react-native';

import { ChevronRightIcon, iconRegistry, type IconName } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics } from '@/theme';

import { settingsLayout } from '../layout';

type SettingsRowProps = {
  label: string;
  value?: string;
  subtitle?: string;
  icon?: IconName;
  showChevron?: boolean;
  onPress?: () => void;
};

export function SettingsRow({ label, value, subtitle, icon, showChevron = true, onPress }: SettingsRowProps) {
  const { colors } = useTheme();
  const Icon = icon ? iconRegistry[icon] : null;

  const content = (
    <View
      style={{
        minHeight: subtitle ? 56 : settingsLayout.rowMinHeight,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: subtitle ? 10 : 8,
      }}
    >
      {Icon ? <Icon size="sm" color={colors.mutedForeground} strokeWidth={1.85} /> : null}
      <View style={{ flex: 1, gap: subtitle ? 2 : 0, minWidth: 0 }}>
        <Text variant="body" style={{ fontSize: 15, fontWeight: '500' }} numberOfLines={1}>
          {label}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="muted" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="caption" color="muted" numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {showChevron && onPress ? (
        <ChevronRightIcon size="sm" color={colors.mutedForeground} strokeWidth={1.85} />
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={({ pressed }) => ({ backgroundColor: pressed ? colors.muted : 'transparent' })}
    >
      {content}
    </Pressable>
  );
}
