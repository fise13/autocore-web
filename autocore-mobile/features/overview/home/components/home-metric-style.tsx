import { memo, type ComponentType } from 'react';

import {
  AlertTriangleIcon,
  BarChart3Icon,
  BoxIcon,
  CameraIcon,
  ClipboardListIcon,
  ClockIcon,
  CoinsIcon,
  PackageIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  WrenchIcon,
} from '@/assets/icons';
import type { SemanticColors } from '@/theme';

import type { HomeMetric, HomeMetricId } from '../types';

export type HomeAccentTone = 'attention' | 'positive' | 'neutral';

type IconComponent = ComponentType<{
  size?: number | 'xs' | 'sm' | 'md' | 'lg';
  color?: string;
  strokeWidth?: number;
}>;

/**
 * A glyph per metric, so a row is recognisable before it is read.
 *
 * Icons only — no tinted wells behind them. The colour lives in the glyph and
 * the title, which is what makes a row scannable without turning the surface
 * into a set of coloured boxes.
 */
const METRIC_ICONS: Record<HomeMetricId, IconComponent> = {
  'cash.balance': CoinsIcon,
  'money.revenue': TrendingUpIcon,
  'money.expense': TrendingDownIcon,
  'money.net': BarChart3Icon,
  'orders.open': ClipboardListIcon,
  'orders.new': ClipboardListIcon,
  'work.assigned_open': WrenchIcon,
  'engines.available': PackageIcon,
  'engines.aging': ClockIcon,
  'parts.available': BoxIcon,
  'parts.low_stock': AlertTriangleIcon,
  'intake.in_progress': CameraIcon,
  'earnings.claimable': CoinsIcon,
};

export function metricIcon(id: HomeMetricId): IconComponent {
  return METRIC_ICONS[id] ?? BarChart3Icon;
}

/**
 * Which colour a metric earns.
 *
 * Deliberately not a per-category palette. Health can tint by category because
 * its categories are the product; here amber already means "this needs you" and
 * green already means "this went well", and spending those two on decoration
 * would leave nothing to say it with. So the accent is read off the metric's own
 * state: a queue that is not empty is attention, a welcome movement is positive,
 * and everything else takes the brand blue.
 */
export function metricAccentTone(metric: HomeMetric): HomeAccentTone {
  if (metric.polarity === 'lower_better' && (metric.value ?? 0) > 0) return 'attention';

  const percent = metric.comparison?.deltaPercent;
  if (percent !== null && percent !== undefined && percent !== 0 && metric.polarity !== 'neutral') {
    const rising = percent > 0;
    const good = metric.polarity === 'higher_better' ? rising : !rising;
    return good ? 'positive' : 'attention';
  }

  return 'neutral';
}

export function accentColor(tone: HomeAccentTone, colors: SemanticColors): string {
  if (tone === 'attention') return colors.warning;
  if (tone === 'positive') return colors.success;
  return colors.chart1;
}

export function metricAccentColor(metric: HomeMetric, colors: SemanticColors): string {
  return accentColor(metricAccentTone(metric), colors);
}

/**
 * A metric's glyph, resolved inside a component rather than by callers.
 *
 * Looking the icon up in render and using the result as a JSX tag reads to the
 * compiler as a component defined during render — a real hazard in general,
 * since such a component remounts on every pass. Resolving it here keeps the
 * lookup at the leaf, where it cannot hold state to lose.
 */
export const MetricGlyph = memo(function MetricGlyph({
  id,
  size,
  color,
}: {
  id: HomeMetricId;
  size: number;
  color: string;
}) {
  const Icon = METRIC_ICONS[id] ?? BarChart3Icon;
  return <Icon size={size} color={color} strokeWidth={2.2} />;
});
