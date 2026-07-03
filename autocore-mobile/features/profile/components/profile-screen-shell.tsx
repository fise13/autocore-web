import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowLeftIcon } from '@/assets/icons';
import { IconButton, Text } from '@/components/ui';
import { useTheme } from '@/hooks';

import { useProfileEnter } from '../animation/use-profile-enter';
import { profileLayout } from '../layout';

type ProfileScreenShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function ProfileScreenShell({ title, subtitle, children }: ProfileScreenShellProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const headerStyle = useProfileEnter({ delay: 0, translateY: 8, duration: 300 });
  const bodyStyle = useProfileEnter({ delay: 50, translateY: 14, duration: 360 });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Animated.View
        style={[
          {
            paddingTop: insets.top + 6,
            paddingHorizontal: profileLayout.pad,
            paddingBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          },
          headerStyle,
        ]}
      >
        <IconButton accessibilityLabel="Назад" variant="ghost" size="sm" onPress={() => router.back()}>
          <ArrowLeftIcon size="sm" color={colors.foreground} strokeWidth={2} />
        </IconButton>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="heading" style={{ fontSize: 20, fontWeight: '700', letterSpacing: -0.3 }}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" color="muted" style={{ fontSize: 12, lineHeight: 16 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: profileLayout.pad,
          paddingBottom: Math.max(insets.bottom, 16) + 96,
        }}
      >
        <Animated.View style={[{ gap: 16 }, bodyStyle]}>{children}</Animated.View>
      </ScrollView>
    </View>
  );
}
