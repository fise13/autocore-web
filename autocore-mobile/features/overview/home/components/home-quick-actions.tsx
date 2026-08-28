import { memo, useCallback, type ComponentType } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import {
  AlertTriangleIcon,
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

import type { HomeQuickAction, HomeQuickActionId } from '../types';
import { home, HomeRow, HomeSection } from './home-primitives';

type ActionIcon = ComponentType<{
  size?: number | 'sm' | 'md' | 'lg';
  color?: string;
  strokeWidth?: number;
}>;

/**
 * One glyph per command, using the shared stroke set so a Home control looks
 * like every other control in the app on both platforms. Continue takes the
 * camera because that is literally where the tap lands.
 */
const ACTION_ICONS: Record<HomeQuickActionId, ActionIcon> = {
  'intake.retry-photos': AlertTriangleIcon,
  'intake.resume': CameraIcon,
  scan: ScanLineIcon,
  'engine.receive': PackageIcon,
  'order.new': ClipboardListIcon,
  'part.new': BoxIcon,
  'transaction.new': CoinsIcon,
  'document.capture': FileTextIcon,
};

/**
 * Quick actions start work — they are not a second navigation menu.
 *
 * Buttons on the canvas rather than rows in a surface: a grouped island would
 * make four shortcuts look like a fifth data section, and equal-width columns
 * broke "Receive engine" across two lines to fit a grid nothing needed. Pills
 * size to their own labels and scroll when there are more of them, which is what
 * lets the section stay one line tall no matter how many commands a role has.
 *
 * Two of the pills are about a specific thing rather than a kind of thing —
 * *Continue U398539*, *Retry photos 3* — so a pill can carry live detail
 * alongside its verb, and takes tone when the state warrants one. Colour is
 * never the only signal: the verb, the glyph and the detail all say it too.
 *
 * The dock's (+) still owns the full New sheet; these are shortcuts past it.
 */
export const HomeQuickActions = memo(function HomeQuickActions({
  actions,
  busyId,
  onRun,
}: {
  actions: HomeQuickAction[];
  /** The command working in place right now, if any. */
  busyId?: HomeQuickActionId | null;
  onRun: (action: HomeQuickAction) => void;
}) {
  const { colors } = useTheme();
  const handleRun = useCallback((action: HomeQuickAction) => () => onRun(action), [onRun]);

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
          const busy = busyId === action.id;

          const surface =
            action.tone === 'blocked'
              ? { fill: colors.dangerSubtle, border: colors.dangerBorder, ink: colors.dangerOnSubtle }
              : action.tone === 'continue'
                ? {
                    fill: colors.primarySubtle,
                    border: colors.primaryBorder,
                    ink: colors.primaryOnSubtle,
                  }
                : { fill: colors.card, border: colors.borderMuted, ink: colors.primary };

          const label = action.detail ? `${action.title} ${action.detail}` : action.title;

          return (
            <HomeRow
              key={action.id}
              accessibilityLabel={label}
              accessibilityHint={action.hint}
              onPress={busy ? undefined : handleRun(action)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: home.micro + 2,
                paddingHorizontal: tokens.space[3.5],
                paddingVertical: 0,
                height: tokens.control.hitTarget,
                borderRadius: tokens.radius.full,
                backgroundColor: surface.fill,
                borderWidth: home.hairline,
                borderColor: surface.border,
                opacity: busy ? 0.72 : 1,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: home.micro + 2 }}>
                {busy ? (
                  <ActivityIndicator size="small" color={surface.ink} />
                ) : Icon ? (
                  <Icon size={17} color={surface.ink} strokeWidth={2} />
                ) : null}

                <Text
                  variant="subheadline"
                  numberOfLines={1}
                  style={{
                    fontWeight: '500',
                    color: action.tone === 'default' ? colors.foreground : surface.ink,
                  }}
                >
                  {action.title}
                </Text>

                {action.detail ? (
                  <Text
                    variant="subheadline"
                    numberOfLines={1}
                    style={{
                      fontWeight: '600',
                      color: surface.ink,
                      maxWidth: 132,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {action.detail}
                  </Text>
                ) : null}
              </View>
            </HomeRow>
          );
        })}
      </ScrollView>
    </HomeSection>
  );
});
