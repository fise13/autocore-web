import { memo, useCallback, type ComponentType } from 'react';
import { ScrollView, View } from 'react-native';

import {
  BoxIcon,
  CameraIcon,
  ClipboardListIcon,
  CoinsIcon,
  FileTextIcon,
  PackageIcon,
  ScanLineIcon,
} from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { tokens } from '@/theme/tokens';

import type { HomeQuickAction } from '../types';
import { home, HomeRow, HomeSection } from './home-primitives';

type ActionIcon = ComponentType<{
  size?: number | 'sm' | 'md' | 'lg';
  color?: string;
  strokeWidth?: number;
}>;

/**
 * Icons for the shell's action catalog. The catalog carries SF Symbol names for
 * the iOS action sheet; the strip uses the shared stroke set so a Home control
 * looks like every other control in the app on both platforms.
 */
const ACTION_ICONS: Record<string, ActionIcon> = {
  scan: ScanLineIcon,
  'receive-engine': PackageIcon,
  photograph: CameraIcon,
  'new-order': ClipboardListIcon,
  'add-item': BoxIcon,
  'new-transaction': CoinsIcon,
  'import-document': FileTextIcon,
};

/**
 * Quick actions start work — they are not a second navigation menu.
 *
 * Buttons on the canvas rather than rows in a surface: a grouped island would
 * make four shortcuts look like a fifth data section, and equal-width columns
 * broke "Receive engine" across two lines to fit a grid nothing needed. Pills
 * size to their own labels and scroll when there are more of them, which is what
 * lets the section stay one line tall no matter how many actions a role has.
 *
 * The dock's (+) still owns the full New sheet; these are shortcuts past it.
 */
export const HomeQuickActions = memo(function HomeQuickActions({
  actions,
  onOpen,
}: {
  actions: HomeQuickAction[];
  onOpen: (action: HomeQuickAction) => void;
}) {
  const { colors } = useTheme();
  const handleOpen = useCallback((action: HomeQuickAction) => () => onOpen(action), [onOpen]);

  if (actions.length === 0) return null;

  return (
    <HomeSection title="Quick actions" quiet>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: home.pad,
          gap: home.inline + 2,
        }}
      >
        {actions.map((action) => {
          const Icon = ACTION_ICONS[action.id];
          return (
            <HomeRow
              key={action.id}
              accessibilityLabel={action.title}
              accessibilityHint={action.subtitle}
              onPress={handleOpen(action)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: home.micro + 2,
                paddingHorizontal: tokens.space[3.5],
                paddingVertical: 0,
                height: tokens.control.hitTarget,
                borderRadius: tokens.radius.full,
                backgroundColor: colors.card,
                borderWidth: home.hairline,
                borderColor: colors.borderMuted,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: home.micro + 2 }}>
                {Icon ? <Icon size={17} color={colors.primary} strokeWidth={2} /> : null}
                <Text
                  variant="subheadline"
                  numberOfLines={1}
                  style={{ fontWeight: '500', color: colors.foreground }}
                >
                  {action.title}
                </Text>
              </View>
            </HomeRow>
          );
        })}
      </ScrollView>
    </HomeSection>
  );
});
