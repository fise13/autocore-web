import { memo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  FadeIn,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ChevronDownIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useMotion, useTheme } from '@/hooks';
import { formatPermission, formatRole } from '@/lib/team/format';
import { haptics } from '@/theme';
import { tokens } from '@/theme/tokens';
import { ROLE_PERMISSIONS, USER_ROLES, type UserRole } from '@/types/user';

const ROLE_SUMMARY: Record<UserRole, string> = {
  owner: 'Full access, including billing and who owns the company.',
  admin: 'Runs the workspace: stock, orders, team, and settings.',
  manager: 'Day-to-day operations — orders, intake, and inventory.',
  accountant: 'Ledger, reports, and exports. Not the shop floor.',
  mechanic: 'Assigned work, engine intake, and own pay.',
  diagnostician: 'Inspect vehicles and update work orders.',
  employee: 'See stock and orders. Cannot change money or the team.',
};

type TeamRoleCardProps = {
  role: UserRole;
  peopleCount: number;
};

export const TeamRoleCard = memo(function TeamRoleCard({ role, peopleCount }: TeamRoleCardProps) {
  const { colors } = useTheme();
  const motion = useMotion();
  const [expanded, setExpanded] = useState(false);
  const open = useSharedValue(0);
  const permissions = ROLE_PERMISSIONS[role];
  const locked = role === 'owner';

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(open.value, [0, 1], [0, 180])}deg` }],
  }));

  const toggle = () => {
    const next = !expanded;
    haptics.selection();
    setExpanded(next);
    open.value = motion.reduced
      ? next
        ? 1
        : 0
      : withTiming(next ? 1 : 0, { duration: motion.duration.fast });
  };

  const peopleLabel =
    peopleCount === 0 ? 'No one yet' : `${peopleCount} ${peopleCount === 1 ? 'person' : 'people'}`;

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: tokens.radius.sheet,
        borderWidth: tokens.control.hairline,
        borderColor: colors.border,
        overflow: 'hidden',
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${formatRole(role)}, ${peopleLabel}`}
        onPress={toggle}
        style={{
          paddingHorizontal: tokens.space[4],
          paddingVertical: tokens.space[3.5],
          gap: tokens.space[1.5],
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] }}>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <Text
                variant="body"
                style={{ fontSize: 17, fontWeight: '600', letterSpacing: -0.35, color: colors.foreground }}
              >
                {formatRole(role)}
              </Text>
              <Text
                variant="caption"
                style={{
                  fontWeight: '500',
                  color: peopleCount > 0 ? colors.primary : colors.mutedForeground,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {peopleLabel}
              </Text>
            </View>
            <Text variant="footnote" color="muted" style={{ lineHeight: 18, letterSpacing: -0.08 }}>
              {ROLE_SUMMARY[role]}
            </Text>
          </View>
          <Animated.View style={chevronStyle}>
            <ChevronDownIcon size="sm" color={colors.mutedForeground} strokeWidth={2} />
          </Animated.View>
        </View>
      </Pressable>

      {expanded ? (
        <Animated.View
          entering={motion.reduced ? undefined : FadeIn.duration(motion.duration.fast)}
          style={{
            paddingHorizontal: tokens.space[4],
            paddingBottom: tokens.space[4],
            gap: tokens.space[2.5],
          }}
        >
          <Text variant="caption" color="muted" style={{ fontWeight: '500' }}>
            {locked ? 'Everything in AutoCore' : `Can ${permissions.length === 1 ? 'do one thing' : `do ${permissions.length} things`}`}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {(locked ? permissions.slice(0, 8) : permissions).map((permission) => (
              <View
                key={permission}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: tokens.radius.control,
                  backgroundColor: colors.secondary,
                }}
              >
                <Text variant="caption" style={{ fontWeight: '500', color: colors.foreground }}>
                  {formatPermission(permission)}
                </Text>
              </View>
            ))}
            {locked && permissions.length > 8 ? (
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: tokens.radius.control,
                  backgroundColor: colors.secondary,
                }}
              >
                <Text variant="caption" color="muted" style={{ fontWeight: '500' }}>
                  +{permissions.length - 8} more
                </Text>
              </View>
            ) : null}
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
});

type TeamRolesListProps = {
  counts: Partial<Record<UserRole, number>>;
};

export function TeamRolesList({ counts }: TeamRolesListProps) {
  return (
    <View style={{ gap: tokens.space[3], paddingHorizontal: tokens.space.screenX }}>
      <Text
        variant="footnote"
        color="muted"
        style={{ lineHeight: 18, marginHorizontal: tokens.space[1], marginBottom: 2 }}
      >
        A role is the default access for that seat. Tap one to see exactly what it can do.
      </Text>
      {USER_ROLES.map((role) => (
        <TeamRoleCard key={role} role={role} peopleCount={counts[role] ?? 0} />
      ))}
      <Text variant="caption" color="muted" style={{ lineHeight: 17, marginHorizontal: tokens.space[1] }}>
        Extra permissions on a person still sit on their profile — they do not change the role itself.
      </Text>
    </View>
  );
}
