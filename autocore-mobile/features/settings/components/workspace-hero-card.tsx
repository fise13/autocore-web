import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';

import { StoreIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { toneBackground } from '@/theme/color-utils';
import { useProfileEnter } from '@/features/profile/animation/use-profile-enter';

import { settingsLayout } from '../layout';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Владелец',
  admin: 'Администратор',
  manager: 'Менеджер',
  accountant: 'Бухгалтер',
  mechanic: 'Механик',
  diagnostician: 'Диагност',
  employee: 'Сотрудник',
};

type WorkspaceHeroCardProps = {
  companyName: string;
  role: string;
  isOwner: boolean;
  isPro: boolean;
  isLoading?: boolean;
};

export function WorkspaceHeroCard({
  companyName,
  role,
  isOwner,
  isPro,
  isLoading = false,
}: WorkspaceHeroCardProps) {
  const { colors, isDark } = useTheme();
  const enterStyle = useProfileEnter({ delay: 40, translateY: 12, duration: 360 });
  const roleLabel = isOwner ? 'Владелец' : ROLE_LABELS[role] ?? 'Сотрудник';

  return (
    <Animated.View style={enterStyle}>
      <LinearGradient
        colors={
          isDark
            ? [toneBackground(colors.primary, 0.32), toneBackground(colors.primary, 0.1)]
            : [toneBackground(colors.primary, 0.16), toneBackground(colors.primary, 0.05)]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: settingsLayout.cardRadius,
          borderWidth: settingsLayout.hairline,
          borderColor: toneBackground(colors.primary, 0.22),
          padding: 20,
          gap: 16,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: toneBackground(colors.primary, isDark ? 0.22 : 0.14),
              borderWidth: 1,
              borderColor: toneBackground(colors.primary, 0.25),
            }}
          >
            <StoreIcon size="md" color={colors.primary} strokeWidth={1.9} />
          </View>

          <View style={{ flex: 1, gap: 8 }}>
            <Text variant="caption" style={{ fontSize: 11, fontWeight: '600', color: colors.primary, letterSpacing: 0.3 }}>
              АКТИВНАЯ КОМПАНИЯ
            </Text>
            <Text
              variant="heading"
              numberOfLines={2}
              style={{ fontSize: 26, fontWeight: '800', letterSpacing: -0.6, lineHeight: 30 }}
            >
              {isLoading ? 'Загрузка…' : companyName}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
              backgroundColor: toneBackground(colors.foreground, isDark ? 0.12 : 0.06),
            }}
          >
            <Text variant="caption" style={{ fontSize: 11, fontWeight: '600' }}>
              {roleLabel}
            </Text>
          </View>
          {isPro ? (
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: colors.primary,
              }}
            >
              <Text variant="caption" style={{ fontSize: 11, fontWeight: '700', color: colors.primaryForeground }}>
                Pro
              </Text>
            </View>
          ) : (
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text variant="caption" color="muted" style={{ fontSize: 11, fontWeight: '600' }}>
                Free
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}
