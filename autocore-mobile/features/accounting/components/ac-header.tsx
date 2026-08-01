import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Pressable } from 'react-native';
import Reanimated from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { PlusIcon, SettingsIcon } from '@/assets/icons';
import { PageHeader } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';
import { toneBackground } from '@/theme/color-utils';
import { useMcEnter } from '@/features/mission-control/animation';

import { acTimeline } from '../animation/timeline';
import { ac } from '../layout';

type AcHeaderProps = {
  operationCount: number;
  canEdit: boolean;
  onNewOperation: () => void;
};

function todayLabel(date = new Date()): string {
  const weekday = format(date, 'EEEE', { locale: enUS });
  const capitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const dayMonth = format(date, 'd MMMM', { locale: enUS });
  return `${capitalized}, ${dayMonth}`;
}

export function AcHeader({ operationCount, canEdit, onNewOperation }: AcHeaderProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const enterStyle = useMcEnter({ delay: acTimeline.header, translateY: 8, duration: 320 });

  return (
    <Reanimated.View style={enterStyle}>
      <PageHeader
        title="Finances"
        subtitle={`${todayLabel()} · ${operationCount} transactions`}
        logo={null}
        align="start"
        trailing={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={canEdit ? 'New transaction' : 'Finance settings'}
            onPress={() => {
              haptics.light();
              if (canEdit) {
                onNewOperation();
                return;
              }
              router.push('/(tabs)/profile/finance');
            }}
            style={{
              width: rhythm.iconBox + rhythm.micro,
              height: rhythm.iconBox + rhythm.micro,
              borderRadius: ac.radius,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: toneBackground(colors.primary, 0.1),
            }}
          >
            {canEdit ? (
              <PlusIcon size="sm" color={colors.primary} strokeWidth={2} />
            ) : (
              <SettingsIcon size="sm" color={colors.primary} strokeWidth={2} />
            )}
          </Pressable>
        }
      />
    </Reanimated.View>
  );
}
