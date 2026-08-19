import { memo } from 'react';

import { useTheme } from '@/hooks';
import type { MotorEntity } from '@/types/motor';

import { EngineTag } from './engine-surface';
import { engineStatusLabel, engineStatusTone, type EngineStatusTone } from '../lib/engine-variants';

type Tones = ReturnType<typeof useTheme>['tones'];

/** Status tone → the pre-composited badge pairing (AA guaranteed). */
export function engineStatusChrome(tone: EngineStatusTone, tones: Tones) {
  switch (tone) {
    case 'success':
      return tones.success;
    case 'warning':
      return tones.warning;
    case 'danger':
      return tones.danger;
    case 'progress':
      return tones.primary;
    default:
      return tones.muted;
  }
}

/**
 * Compact status mark for a catalog row. Colour lives on the tag fill, the
 * word still follows it — colour alone would fail anyone who cannot separate
 * the greens from the reds.
 */
export const EngineStatusDot = memo(function EngineStatusDot({
  motor,
}: {
  motor: MotorEntity;
}) {
  return <EngineStatusPill motor={motor} compact />;
});

/** Detail-screen tag — same language as the catalog, a little more padding. */
export const EngineStatusPill = memo(function EngineStatusPill({
  motor,
  compact = false,
}: {
  motor: MotorEntity;
  compact?: boolean;
}) {
  const { tones } = useTheme();
  const tone = engineStatusTone(motor);
  const chrome = engineStatusChrome(tone, tones);
  const label = engineStatusLabel(motor);

  return (
    <EngineTag
      label={label}
      chrome={chrome}
      compact={compact}
      accessibilityLabel={`Status ${label}`}
    />
  );
});
