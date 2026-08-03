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
  tone?: 'default' | 'danger';
};

export function SettingsSectionTitle({ title, subtitle, tone = 'default' }: SettingsSectionTitleProps) {
  const { colors } = useTheme();
  const titleColor =
    tone === 'danger' ? colors.danger ?? colors.destructive : colors.mutedForeground;

  return (
    <View style={{ paddingHorizontal: settingsLayout.pad, gap: 4 }}>
      <Text variant="sectionLabel" style={{ color: titleColor }}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="footnote" color="muted">
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
