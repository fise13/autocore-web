import { Children, type ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { rhythm } from '@/theme';

import { settingsLayout } from '../layout';

type SettingsSectionTitleProps = {
  title: string;
  subtitle?: string;
  delay?: number;
};

export function SettingsSectionTitle({ title, subtitle }: SettingsSectionTitleProps) {
  const { colors } = useTheme();

  return (
    <View style={{ paddingHorizontal: settingsLayout.pad, gap: 4 }}>
      <Text
        variant="caption"
        style={{
          fontSize: 12,
          fontWeight: '600',
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          color: colors.mutedForeground,
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

type SettingsGroupProps = {
  children: ReactNode;
};

export function SettingsGroup({ children }: SettingsGroupProps) {
  const { colors } = useTheme();
  const items = Children.toArray(children).filter(Boolean);

  return (
    <View
      style={{
        marginHorizontal: settingsLayout.pad,
        borderRadius: rhythm.cardRadius,
        borderWidth: settingsLayout.hairline,
        borderColor: colors.border,
        backgroundColor: colors.card,
        overflow: 'hidden',
      }}
    >
      {items.map((child, index) => (
        <View key={index}>
          {child}
          {index < items.length - 1 ? (
            <View
              style={{
                height: settingsLayout.hairline,
                backgroundColor: colors.border,
                marginLeft: rhythm.cardPadX,
              }}
            />
          ) : null}
        </View>
      ))}
    </View>
  );
}

export function SettingsGroupDivider() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        height: settingsLayout.hairline,
        backgroundColor: colors.border,
        marginLeft: rhythm.cardPadX,
      }}
    />
  );
}
