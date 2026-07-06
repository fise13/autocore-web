import Reanimated from 'react-native-reanimated';
import { Pressable } from 'react-native';

import { SettingsIcon } from '@/assets/icons';
import { PageHeader } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';
import { toneBackground } from '@/theme/color-utils';

import { searchTimeline, useSearchEnter } from '../animation';
import { searchLayout } from '../layout';

type SearchHeaderProps = {
  onSettingsPress?: () => void;
};

export function SearchHeader({ onSettingsPress }: SearchHeaderProps) {
  const { colors } = useTheme();
  const enterStyle = useSearchEnter({ delay: searchTimeline.header, translateY: 8, duration: 320 });

  return (
    <Reanimated.View style={enterStyle}>
      <PageHeader
        title="Поиск"
        subtitle="Быстрый доступ к складу, моторам и заказам"
        logo={null}
        align="center"
        trailing={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Настройки"
            onPress={() => {
              haptics.light();
              onSettingsPress?.();
            }}
            style={{
              width: rhythm.iconBox + rhythm.micro,
              height: rhythm.iconBox + rhythm.micro,
              borderRadius: searchLayout.radius,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: toneBackground(colors.foreground, 0.05),
            }}
          >
            <SettingsIcon size="sm" color={colors.mutedForeground} strokeWidth={1.75} />
          </Pressable>
        }
      />
    </Reanimated.View>
  );
}
