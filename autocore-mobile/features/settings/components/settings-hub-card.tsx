import type { ComponentType } from 'react';
import { Pressable, View } from 'react-native';

import { ChevronRightIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics } from '@/theme';

import { settingsLayout } from '../layout';

type SettingsHubCardProps = {
  title: string;
  subtitle: string;
  icon: ComponentType<{ size?: 'sm' | 'md' | 'lg'; color?: string; strokeWidth?: number }>;
  delay?: number;
  tone?: 'default' | 'pro';
  onPress: () => void;
};

export function SettingsHubCard({ title, subtitle, icon: Icon, onPress }: SettingsHubCardProps) {
  const { colors } = useTheme();

  return (
    <View style={{ paddingHorizontal: settingsLayout.pad }}>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          haptics.selection();
          onPress();
        }}
        style={({ pressed }) => ({
          minHeight: 56,
          borderRadius: settingsLayout.cardRadius,
          borderWidth: settingsLayout.hairline,
          borderColor: colors.border,
          backgroundColor: pressed ? colors.muted : colors.card,
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        })}
      >
        <Icon size="sm" color={colors.mutedForeground} strokeWidth={1.85} />
        <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
          <Text variant="body" style={{ fontSize: 15, fontWeight: '500' }} numberOfLines={1}>
            {title}
          </Text>
          <Text variant="caption" color="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <ChevronRightIcon size="sm" color={colors.mutedForeground} strokeWidth={1.85} />
      </Pressable>
    </View>
  );
}
