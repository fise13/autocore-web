import { View, type ViewProps } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/hooks';
import { radius, rhythm, spacing, type ToneName } from '@/theme';
import type { IconProps } from '@/assets/icons';

import { Text } from './text';

/**
 * Tone escalates as a limit fills, so the row carries its own status without
 * needing a separate badge: comfortable -> primary, tight -> warning, at or
 * over the cap -> danger. An unlimited or unmetered row stays muted.
 */
export function usageTone(used: number, limit: number | null): ToneName {
  if (limit === null || limit <= 0) return 'muted';
  const ratio = used / limit;
  if (ratio >= 1) return 'danger';
  if (ratio >= 0.8) return 'warning';
  return 'primary';
}

type UsageRingProps = {
  /** 0–1. Values outside the range are clamped. */
  progress: number;
  tone: ToneName;
  size?: number;
};

export function UsageRing({ progress, tone, size = 18 }: UsageRingProps) {
  const { colors, tones } = useTheme();
  const clamped = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));

  const strokeWidth = size >= 24 ? 3 : 2.5;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={colors.borderMuted}
        strokeWidth={strokeWidth}
        fill="none"
      />
      {clamped > 0 ? (
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={tones[tone].fg}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          fill="none"
          // Start the sweep at 12 o'clock instead of 3.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      ) : null}
    </Svg>
  );
}

type UsageMeterRowProps = ViewProps & {
  label: string;
  used: number;
  /** `null` renders an unmetered row (icon instead of ring). */
  limit: number | null;
  /** Overrides the `used / limit` readout — e.g. "7 days". */
  valueLabel?: string;
  /** Shown in place of the ring when the row has no numeric limit. */
  icon?: React.ComponentType<IconProps>;
  showDivider?: boolean;
};

export function UsageMeterRow({
  label,
  used,
  limit,
  valueLabel,
  icon: Icon,
  showDivider = true,
  style,
  ...props
}: UsageMeterRowProps) {
  const { colors, tones } = useTheme();
  const tone = usageTone(used, limit);
  const isMetered = limit !== null && limit > 0;

  const readout = valueLabel ?? (limit === null ? String(used) : `${used} / ${limit}`);

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[2.5],
          minHeight: rhythm.rowMinHeight,
          borderBottomWidth: showDivider ? rhythm.hairline : 0,
          borderBottomColor: colors.borderMuted,
        },
        style,
      ]}
      {...props}
    >
      <View style={{ width: 20, alignItems: 'center', justifyContent: 'center' }}>
        {isMetered ? (
          <UsageRing progress={used / limit} tone={tone} />
        ) : Icon ? (
          <Icon size="sm" color={colors.mutedForeground} />
        ) : (
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: radius.full,
              backgroundColor: colors.borderMuted,
            }}
          />
        )}
      </View>

      <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>
        {label}
      </Text>

      <Text
        variant="bodyStrong"
        style={{
          color: tone === 'muted' ? colors.mutedForeground : tones[tone].fg,
          fontVariant: ['tabular-nums'],
        }}
      >
        {readout}
      </Text>
    </View>
  );
}
