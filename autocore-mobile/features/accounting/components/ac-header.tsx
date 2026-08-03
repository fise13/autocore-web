import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Pressable, View } from 'react-native';
import Reanimated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlusIcon, SettingsIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { openFinanceSettings } from '@/lib/navigation/open-finance-settings';
import { haptics, rhythm, tokens } from '@/theme';
import { useMcEnter } from '@/features/overview/animation';

import { acTimeline } from '../animation/timeline';

type AcHeaderProps = {
  operationCount: number;
  canEdit: boolean;
  onNewOperation: () => void;
};

const ACTION_SIZE = tokens.control.hitTarget;

function todayLabel(date = new Date()): string {
  const weekday = format(date, 'EEEE', { locale: enUS });
  const capitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const dayMonth = format(date, 'd MMMM', { locale: enUS });
  return `${capitalized}, ${dayMonth}`;
}

/**
 * Finances hub chrome — labeled Add control (not a ghost SF glyph) so the
 * primary compose action stays readable on both light and dark backgrounds.
 */
export function AcHeader({ operationCount, canEdit, onNewOperation }: AcHeaderProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const enterStyle = useMcEnter({ delay: acTimeline.header, translateY: 8, duration: 320 });

  return (
    <Reanimated.View style={enterStyle}>
      <View
        style={{
          paddingTop: insets.top + rhythm.headerTop,
          paddingBottom: rhythm.tight,
          paddingHorizontal: tokens.space.screenX,
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: tokens.space.stack,
        }}
      >
        <View style={{ flex: 1, gap: tokens.space.micro }}>
          <Text
            variant="largeTitle"
            style={{
              fontSize: 34,
              lineHeight: 40,
              fontWeight: '700',
              letterSpacing: -0.6,
            }}
          >
            Finances
          </Text>
          <Text variant="subheadline" color="muted">
            {`${todayLabel()} · ${operationCount} transactions`}
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: tokens.space.inline,
            paddingTop: tokens.space.micro,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Finance settings"
            hitSlop={6}
            onPress={() => {
              haptics.light();
              openFinanceSettings(router, { returnTo: 'accounting' });
            }}
            style={{
              width: ACTION_SIZE,
              height: ACTION_SIZE,
              borderRadius: tokens.radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.secondary,
            }}
          >
            <SettingsIcon size={20} color={colors.foreground} strokeWidth={1.85} />
          </Pressable>

          {canEdit ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add operation"
              hitSlop={4}
              onPress={() => {
                haptics.light();
                onNewOperation();
              }}
              style={{
                minHeight: ACTION_SIZE,
                paddingHorizontal: tokens.space.stack + 2,
                borderRadius: tokens.radius.full,
                flexDirection: 'row',
                alignItems: 'center',
                gap: tokens.space.micro + 2,
                backgroundColor: colors.primary,
              }}
            >
              <PlusIcon size={18} color={colors.primaryForeground} strokeWidth={2.4} />
              <Text
                variant="headline"
                style={{ color: colors.primaryForeground, fontSize: 15, fontWeight: '600' }}
              >
                Add
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Reanimated.View>
  );
}
