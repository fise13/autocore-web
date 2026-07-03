import Animated from 'react-native-reanimated';

import { ProfileNavCard } from './profile-nav-card';
import { useProfileEnter } from '../animation/use-profile-enter';
import { profileLayout } from '../layout';
import { useTheme } from '@/hooks';
import type { ProfileQuickAction, ProfilePreferenceRow, ProfileWorkspaceRow } from '../types';

export function ProfileQuickActionRow({
  action,
  delay,
  onPress,
}: {
  action: ProfileQuickAction;
  delay: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const Icon = action.icon;
  const style = useProfileEnter({ delay, translateY: 12, duration: 350 });

  return (
    <Animated.View
      style={[
        {
          marginHorizontal: profileLayout.pad,
          borderRadius: profileLayout.groupRadius,
          borderWidth: profileLayout.hairline,
          borderColor: colors.border,
          backgroundColor: colors.card,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <ProfileNavCard title={action.title} subtitle={action.subtitle} icon={Icon} onPress={onPress} />
    </Animated.View>
  );
}

export function ProfilePreferenceRowItem({
  row,
  delay,
  onPress,
}: {
  row: ProfilePreferenceRow;
  delay: number;
  onPress: () => void;
}) {
  const Icon = row.icon;
  const style = useProfileEnter({ delay, translateY: 10, duration: 340 });

  return (
    <Animated.View style={style}>
      <ProfileNavCard title={row.title} value={row.value} icon={Icon} onPress={onPress} />
    </Animated.View>
  );
}

export function ProfileWorkspaceRowItem({
  row,
  delay,
  onPress,
}: {
  row: ProfileWorkspaceRow;
  delay: number;
  onPress: () => void;
}) {
  const style = useProfileEnter({ delay, translateY: 10, duration: 340 });

  return (
    <Animated.View style={style}>
      <ProfileNavCard title={row.title} value={row.value} onPress={onPress} />
    </Animated.View>
  );
}
