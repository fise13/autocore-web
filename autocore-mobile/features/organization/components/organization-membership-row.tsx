import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CheckCircle2Icon, ChevronRightIcon } from '@/assets/icons';
import { CompanyAvatar } from '@/components/account/company-avatar';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { haptics, rhythm } from '@/theme';

type OrganizationMembershipRowProps = {
  companyId: string;
  title: string;
  subtitle: string;
  active?: boolean;
  bordered?: boolean;
  onPress?: () => void;
};

/** Membership row — matches WorkspaceCompaniesSection / SettingsLinkRow anatomy. */
export const OrganizationMembershipRow = memo(function OrganizationMembershipRow({
  companyId,
  title,
  subtitle,
  active = false,
  bordered = false,
  onPress,
}: OrganizationMembershipRowProps) {
  const { colors } = useTheme();
  const interactive = Boolean(onPress) && !active;

  return (
    <View>
      {bordered ? (
        <View
          style={[styles.divider, { backgroundColor: colors.border, marginLeft: rhythm.cardPadX }]}
        />
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        disabled={!interactive}
        onPress={() => {
          if (!interactive || !onPress) return;
          haptics.selection();
          onPress();
        }}
      >
        {({ pressed }) => (
          <View
            style={[
              styles.row,
              {
                paddingHorizontal: rhythm.cardPadX,
                backgroundColor: pressed && interactive ? colors.muted : 'transparent',
              },
            ]}
          >
            <CompanyAvatar companyId={companyId} name={title} size="sm" />
            <View style={styles.copy}>
              <Text variant="body" numberOfLines={1} style={styles.title}>
                {title}
              </Text>
              <Text variant="caption" color="muted" numberOfLines={1}>
                {subtitle}
              </Text>
            </View>
            {active ? (
              <CheckCircle2Icon size="sm" color={colors.primary} strokeWidth={1.85} />
            ) : interactive ? (
              <ChevronRightIcon size="sm" color={colors.mutedForeground} strokeWidth={1.85} />
            ) : null}
          </View>
        )}
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: rhythm.inline,
    paddingVertical: 10,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
});
