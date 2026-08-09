import { memo, useCallback, useMemo, type ComponentType } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { BoxIcon, CoinsIcon, PlusIcon, ScanLineIcon } from '@/assets/icons';
import { useNavigateTab } from '@/components/navigation/use-navigate-tab';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { useCompanyModuleEnabled } from '@/hooks/use-module-enabled';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';
import { presentActionSheet } from '@/lib/shell/present-action-sheet';
import { haptics, rhythm, tokens } from '@/theme';
import { radius } from '@/theme/radius';

import { McPressable, mcTimeline, useMcEnter, useMcNavigatePress } from '../animation';
import { mcType } from '../layout';
import { McSectionTitle } from './mc-primitives';

const ACTION_SIZE = 56;

type QuickIcon = ComponentType<{ size?: 'sm' | 'md' | 'lg'; color?: string; strokeWidth?: number }>;

type QuickActionDef = {
  id: string;
  label: string;
  icon: QuickIcon;
  href?: string;
  /** Opens the global New sheet instead of navigating. */
  openNewSheet?: boolean;
};

const QuickActionButton = memo(function QuickActionButton({
  action,
  index,
}: {
  action: QuickActionDef;
  index: number;
}) {
  const navigateTab = useNavigateTab();
  const { colors } = useTheme();
  const Icon = action.icon;
  const delay = mcTimeline.quickActions + index * mcTimeline.quickActionStagger;
  const buttonStyle = useMcEnter({ delay, translateY: 6 });

  const run = useCallback(() => {
    if (action.openNewSheet) {
      presentActionSheet();
      return;
    }
    if (action.href) navigateTab(action.href);
  }, [action.href, action.openNewSheet, navigateTab]);

  const { press } = useMcNavigatePress(run);

  const handlePress = useCallback(() => {
    haptics.light();
    press();
  }, [press]);

  return (
    <Animated.View style={[{ flex: 1, alignItems: 'center', gap: rhythm.tight }, buttonStyle]}>
      <McPressable
        accessibilityRole="button"
        accessibilityLabel={action.label}
        onPress={handlePress}
        style={{
          width: ACTION_SIZE,
          height: ACTION_SIZE,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.card,
        }}
      >
        <Icon size="md" color={colors.primary} strokeWidth={1.75} />
      </McPressable>
      <Text
        variant="caption"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        style={{
          ...mcType.statLabel,
          color: colors.foreground,
          textAlign: 'center',
          width: '100%',
        }}
      >
        {action.label}
      </Text>
    </Animated.View>
  );
});

export const McQuickActions = memo(function McQuickActions() {
  const rbac = useRbacPolicy();
  const warehouseEnabled = useCompanyModuleEnabled('warehouse');
  const sectionStyle = useMcEnter({ delay: mcTimeline.quickActionsTitle, translateY: 4 });

  const actions = useMemo((): QuickActionDef[] => {
    const next: QuickActionDef[] = [];

    if (rbac.scopes.inventory !== 'none' && warehouseEnabled) {
      next.push({
        id: 'add',
        label: 'Add part',
        icon: PlusIcon,
        openNewSheet: true,
      });
      next.push({
        id: 'scan',
        label: 'Scan',
        icon: ScanLineIcon,
        href: '/(tabs)/scan',
      });
      next.push({
        id: 'inventory',
        label: 'Inventory',
        icon: BoxIcon,
        href: '/warehouse',
      });
    }

    if (rbac.scopes.accounting !== 'none') {
      next.push({
        id: 'finance',
        label: 'Finance',
        icon: CoinsIcon,
        href: '/(tabs)/accounting',
      });
    }

    return next.slice(0, 4);
  }, [rbac.scopes.accounting, rbac.scopes.inventory, warehouseEnabled]);

  if (actions.length === 0) return null;

  return (
    <Animated.View style={[{ gap: tokens.space.micro }, sectionStyle]}>
      <McSectionTitle title="Quick actions" />
      <View style={{ flexDirection: 'row', gap: rhythm.tight }}>
        {actions.map((action, index) => (
          <QuickActionButton key={action.id} action={action} index={index} />
        ))}
      </View>
    </Animated.View>
  );
});
