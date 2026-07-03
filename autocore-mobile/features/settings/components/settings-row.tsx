import { Pressable, View } from 'react-native';

import { ChevronRightIcon, iconRegistry, type IconName } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics } from '@/theme';
import { toneBackground } from '@/theme/color-utils';

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
        minHeight: subtitle ? 64 : settingsLayout.rowMinHeight,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: subtitle ? 12 : 10,
      }}
    >
      {Icon ? (
        <View
          style={{
            width: settingsLayout.iconBox,
            height: settingsLayout.iconBox,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: toneBackground(colors.primary, 0.1),
          }}
        >
          <Icon size="sm" color={colors.primary} strokeWidth={2} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: subtitle ? 3 : 0 }}>
        <Text variant="body" style={{ fontSize: 15, fontWeight: '600', letterSpacing: -0.1 }}>
          {label}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="muted" style={{ lineHeight: 17 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="caption" color="muted" style={{ fontSize: 13, marginRight: 4 }}>
          {value}
        </Text>
      ) : null}
      {showChevron && onPress ? <ChevronRightIcon size="sm" color={colors.mutedForeground} strokeWidth={2} /> : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptics.light();
        onPress();
      }}
    >
      {content}
    </Pressable>
  );
}
