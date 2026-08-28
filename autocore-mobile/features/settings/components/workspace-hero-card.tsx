import { Pressable, View } from 'react-native';

import { ChevronRightIcon } from '@/assets/icons';
import { PremiumBadge } from '@/components/subscription/premium-badge';
import { SettingsSectionCard, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';
import { tokens } from '@/theme/tokens';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  accountant: 'Accountant',
  mechanic: 'Mechanic',
  diagnostician: 'Diagnostician',
  employee: 'Employee',
};

type WorkspaceHeroCardProps = {
  companyName: string;
  role: string;
  isOwner: boolean;
  isLoading?: boolean;
  onPress?: () => void;
  showSwitcherHint?: boolean;
};

export function WorkspaceHeroCard({
  companyName,
  role,
  isOwner,
  isLoading = false,
  onPress,
  showSwitcherHint,
}: WorkspaceHeroCardProps) {
  const { colors } = useTheme();
  const roleLabel = isOwner ? 'Owner' : ROLE_LABELS[role] ?? 'Employee';
  const description = showSwitcherHint ? `${roleLabel} · tap to switch` : roleLabel;

  const body = (
    <View style={{ paddingHorizontal: rhythm.cardPadX, paddingBottom: rhythm.cardPadX }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: rhythm.inline }}>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: rhythm.inline }}>
            <Text
              variant="body"
              style={{ fontSize: 17, fontWeight: '600', flexShrink: 1 }}
              numberOfLines={2}
            >
              {isLoading ? 'Loading…' : companyName}
            </Text>
            <PremiumBadge />
          </View>
          <Text variant="caption" color="muted" numberOfLines={2}>
            {description}
          </Text>
        </View>
        {onPress ? (
          <ChevronRightIcon size="sm" color={colors.mutedForeground} strokeWidth={1.85} />
        ) : null}
      </View>
    </View>
  );

  if (!onPress) {
    return (
      <SettingsSectionCard title="Active Company" description={roleLabel}>
        {body}
      </SettingsSectionCard>
    );
  }

  return (
    <SettingsSectionCard title="Active Company">
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          haptics.selection();
          onPress();
        }}
      >
        {({ pressed }) => (
          <View style={{ opacity: pressed ? tokens.opacity.pressed : 1 }}>{body}</View>
        )}
      </Pressable>
    </SettingsSectionCard>
  );
}
