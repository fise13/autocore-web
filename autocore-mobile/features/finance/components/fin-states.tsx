import { View } from 'react-native';

import { AlertTriangleIcon, BarChart3Icon, CloudIcon, PlusIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';

import { fin, finType } from '../layout';
import type { FinanceDataGap } from '../types';
import { FinPressable, FinSheet } from './fin-primitives';

type NoticeTone = 'offline' | 'warning' | 'danger';

/**
 * One notice component for every degraded state. It never hides the numbers
 * underneath — the figures stay readable and the strip says what is true about
 * them, because a finance screen that blanks out is worse than a stale one.
 */
export function FinNotice({
  tone,
  title,
  detail,
  actionLabel,
  onAction,
}: {
  tone: NoticeTone;
  title: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();

  const palette =
    tone === 'offline'
      ? { bg: colors.offlineSubtle, border: colors.offlineBorder, fg: colors.offlineOnSubtle }
      : tone === 'warning'
        ? { bg: colors.warningSubtle, border: colors.warningBorder, fg: colors.warningOnSubtle }
        : { bg: colors.dangerSubtle, border: colors.dangerBorder, fg: colors.dangerOnSubtle };

  const Icon = tone === 'offline' ? CloudIcon : AlertTriangleIcon;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: fin.inline + 2,
        padding: fin.stack - 4,
        borderRadius: fin.rowRadius,
        backgroundColor: palette.bg,
        borderWidth: fin.hairline,
        borderColor: palette.border,
      }}
    >
      <Icon size={16} color={palette.fg} strokeWidth={2} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ ...finType.label, color: palette.fg }}>{title}</Text>
        {detail ? (
          <Text style={{ ...finType.caption, color: palette.fg, opacity: 0.85 }}>{detail}</Text>
        ) : null}
        {actionLabel && onAction ? (
          <FinPressable
            onPress={onAction}
            accessibilityLabel={actionLabel}
            style={{ paddingTop: fin.micro }}
          >
            <Text style={{ ...finType.label, color: palette.fg, textDecorationLine: 'underline' }}>
              {actionLabel}
            </Text>
          </FinPressable>
        ) : null}
      </View>
    </View>
  );
}

/** Centred message for the cases where there is genuinely nothing to render. */
export function FinFullState({
  icon: Icon = BarChart3Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon?: typeof BarChart3Icon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={{ alignItems: 'center', gap: fin.stack, paddingHorizontal: fin.pad }}>
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.secondary,
        }}
      >
        <Icon size={22} color={colors.mutedForeground} strokeWidth={1.7} />
      </View>
      <View style={{ gap: fin.tight, alignItems: 'center' }}>
        <Text style={{ ...finType.sectionTitle, textAlign: 'center' }}>{title}</Text>
        <Text style={{ ...finType.rowMeta, textAlign: 'center' }} color="muted">
          {description}
        </Text>
      </View>
      {actionLabel && onAction ? (
        <FinPressable
          onPress={onAction}
          haptic="light"
          accessibilityLabel={actionLabel}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 16,
            paddingVertical: 11,
            borderRadius: fin.pillRadius,
            backgroundColor: colors.primary,
          }}
        >
          <PlusIcon size={16} color={colors.primaryForeground} strokeWidth={2.4} />
          <Text style={{ ...finType.label, fontWeight: '600', color: colors.primaryForeground }}>
            {actionLabel}
          </Text>
        </FinPressable>
      ) : null}
    </View>
  );
}

/**
 * What the ledger cannot answer, stated plainly.
 *
 * Every gap names the metric it blocks and the record that would unblock it, so
 * an absent number reads as a known limit rather than a broken screen.
 */
export function FinGaps({ gaps }: { gaps: FinanceDataGap[] }) {
  const { colors } = useTheme();
  if (gaps.length === 0) return null;

  return (
    <FinSheet padded style={{ gap: fin.stack - 4, backgroundColor: colors.secondary }}>
      {gaps.map((gap, index) => (
        <View key={gap.id} style={{ gap: 3, paddingTop: index > 0 ? fin.tight : 0 }}>
          <Text style={{ ...finType.label, color: colors.foreground }}>{gap.label}</Text>
          <Text style={finType.caption} color="muted">
            {gap.detail}
          </Text>
        </View>
      ))}
    </FinSheet>
  );
}
