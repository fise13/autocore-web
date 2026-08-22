import { View } from 'react-native';

import { AlertTriangleIcon, BarChart3Icon, CloudIcon, PlusIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/hooks';

import { fin, finType } from '../layout';
import type { FinanceDataGap } from '../types';
import { FinChevron, FinPressable, FinSheet } from './fin-primitives';

type NoticeTone = 'offline' | 'warning' | 'danger';

function toneAccent(tone: NoticeTone, colors: ReturnType<typeof useTheme>['colors']): string {
  if (tone === 'offline') return colors.offlineOnSubtle;
  if (tone === 'warning') return colors.warning;
  return colors.danger;
}

/**
 * Actionable state in a Health-style card — accent dot and copy, not a tinted
 * banner that fights the numbers underneath.
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
  const accent = toneAccent(tone, colors);
  const Icon = tone === 'offline' ? CloudIcon : AlertTriangleIcon;

  return (
    <FinSheet>
      <FinPressable
        onPress={onAction}
        disabled={!onAction}
        haptic="light"
        accessibilityLabel={[title, detail, actionLabel].filter(Boolean).join('. ')}
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: fin.stack,
          paddingHorizontal: fin.stack,
          paddingVertical: fin.stack - 2,
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.secondary,
            marginTop: 1,
          }}
        >
          <Icon size={16} color={accent} strokeWidth={2} />
        </View>

        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: fin.inline }}>
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: accent,
              }}
            />
            <Text style={{ ...finType.rowTitle, fontWeight: '600', color: colors.foreground, flex: 1 }}>
              {title}
            </Text>
          </View>
          {detail ? (
            <Text style={finType.caption} color="muted">
              {detail}
            </Text>
          ) : null}
          {actionLabel && onAction ? (
            <Text style={{ ...finType.caption, fontWeight: '600', color: colors.primary }}>
              {actionLabel}
            </Text>
          ) : null}
        </View>

        {onAction ? <FinChevron /> : null}
      </FinPressable>
    </FinSheet>
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
