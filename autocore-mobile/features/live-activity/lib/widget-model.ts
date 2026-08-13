/**
 * Props for the Home Screen and Lock Screen widgets.
 *
 * WidgetKit reloads a widget on the system's schedule, not the app's, so a
 * widget always renders data that is at least a little stale. Everything here is
 * therefore designed to degrade honestly: a count that has never loaded renders
 * as `—`, never as `0`, and each snapshot carries the moment it was taken so the
 * widget can say "2 min ago" instead of implying it is live.
 *
 * Pure module — relative imports only, no React Native.
 */
import type { SyncStatus } from '../../engine-intake/lib/sync-status';

import {
  liveActivityAccent,
  liveActivitySymbol,
  type LiveActivitySymbol,
} from './live-activity-model';

/** Same reasoning as `LiveActivitySymbol` — literals, so `Image systemName` typechecks. */
export type TodayWidgetSymbol =
  | 'shippingbox.fill'
  | 'wrench.and.screwdriver.fill'
  | 'exclamationmark.triangle.fill'
  | 'checkmark.circle.fill'
  | 'engine.combustion.fill'
  | 'arrow.triangle.2.circlepath';

/** A count the app has not yet loaded. Rendered as an em dash. */
export const UNKNOWN_COUNT = -1;

export type SyncWidgetProps = {
  status: SyncStatus;
  /** "Syncing 8 of 18" */
  title: string;
  /** "10 photos left" */
  detail: string;
  /** "8/18" — the accessoryCircular / accessoryInline numeral. */
  short: string;
  caption: string;
  symbol: LiveActivitySymbol;
  accent: string;
  /** 0–1. */
  progress: number;
  determinate: boolean;
  pending: number;
  blocked: number;
  updatedAtMs: number;
};

export type TodayWidgetCounts = {
  /** Open work orders, or UNKNOWN_COUNT. */
  openOrders: number;
  /** Open orders waiting on parts. */
  attentionOrders: number;
  /** Serialized motors in stock. */
  engines: number;
  /** Received stock with no location yet. */
  awaitingPlacement: number;
  /** Active parts below their reorder point. */
  lowStock: number;
};

export type TodayWidgetProps = TodayWidgetCounts & {
  /** Big numeral for systemSmall / accessoryCircular. */
  headline: string;
  /** One line describing what most needs a person. */
  title: string;
  detail: string;
  symbol: TodayWidgetSymbol;
  accent: string;
  /** True when at least one count wants attention today. */
  urgent: boolean;
  updatedAtMs: number;
};

export const EMPTY_TODAY_COUNTS: TodayWidgetCounts = {
  openOrders: UNKNOWN_COUNT,
  attentionOrders: UNKNOWN_COUNT,
  engines: UNKNOWN_COUNT,
  awaitingPlacement: UNKNOWN_COUNT,
  lowStock: UNKNOWN_COUNT,
};

function known(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

export function buildSyncWidgetProps(
  summary: {
    status: SyncStatus;
    headline: string;
    detail: string | null;
    progressLabel: string;
    progress: number;
    pending: number;
    blocked: number;
    total: number;
  },
  updatedAtMs: number,
): SyncWidgetProps {
  const blocked = summary.status === 'FAILED' || summary.status === 'ACTION_REQUIRED';
  return {
    status: summary.status,
    // WidgetKit decides when this redraws, which may be minutes from now. A
    // countdown baked into the title would be wrong by then; a state is not.
    title: summary.status === 'RETRYING' ? 'Waiting to retry' : summary.headline,
    detail: summary.detail ?? '',
    short: blocked
      ? String(summary.blocked)
      : summary.status === 'SYNCED'
        ? 'All set'
        : summary.progressLabel,
    caption: blocked ? 'blocked' : summary.status === 'SYNCED' ? 'synced' : 'photos',
    symbol: liveActivitySymbol(summary.status),
    accent: liveActivityAccent(summary.status),
    progress: summary.status === 'SYNCED' ? 1 : summary.progress,
    determinate: summary.status === 'SYNCING' && summary.total > 0,
    pending: summary.pending,
    blocked: summary.blocked,
    updatedAtMs,
  };
}

/**
 * Ranks the day by what actually blocks someone, hardest first: stock nobody can
 * find beats an order waiting on parts, which beats a plain open order. A widget
 * has one line — it has to spend it on the thing that would otherwise be missed.
 */
export function buildTodayWidgetProps(
  counts: TodayWidgetCounts,
  updatedAtMs: number,
): TodayWidgetProps {
  const base = {
    ...counts,
    updatedAtMs,
  };

  if (known(counts.awaitingPlacement) && counts.awaitingPlacement > 0) {
    return {
      ...base,
      headline: String(counts.awaitingPlacement),
      title: `${counts.awaitingPlacement} ${plural(counts.awaitingPlacement, 'item', 'items')} to place`,
      detail: 'Received stock with no location yet.',
      symbol: 'shippingbox.fill',
      accent: '#FF9F0A',
      urgent: true,
    };
  }

  if (known(counts.attentionOrders) && counts.attentionOrders > 0) {
    return {
      ...base,
      headline: String(counts.attentionOrders),
      title: `${counts.attentionOrders} ${plural(counts.attentionOrders, 'order', 'orders')} waiting on parts`,
      detail: known(counts.openOrders) ? `${counts.openOrders} open in total.` : '',
      symbol: 'wrench.and.screwdriver.fill',
      accent: '#FF9F0A',
      urgent: true,
    };
  }

  if (known(counts.lowStock) && counts.lowStock > 0) {
    return {
      ...base,
      headline: String(counts.lowStock),
      title: `${counts.lowStock} ${plural(counts.lowStock, 'part', 'parts')} low on stock`,
      detail: 'Below reorder point.',
      symbol: 'exclamationmark.triangle.fill',
      accent: '#FF9F0A',
      urgent: true,
    };
  }

  if (known(counts.openOrders) && counts.openOrders > 0) {
    return {
      ...base,
      headline: String(counts.openOrders),
      title: `${counts.openOrders} open ${plural(counts.openOrders, 'order', 'orders')}`,
      detail: known(counts.engines) ? `${counts.engines} engines in stock.` : '',
      symbol: 'wrench.and.screwdriver.fill',
      accent: '#0A84FF',
      urgent: false,
    };
  }

  if (known(counts.openOrders)) {
    return {
      ...base,
      headline: '0',
      title: 'No open orders',
      detail: known(counts.engines) ? `${counts.engines} engines in stock.` : 'The floor is clear.',
      symbol: 'checkmark.circle.fill',
      accent: '#30D158',
      urgent: false,
    };
  }

  // Nothing has loaded yet. Say so rather than inventing a zero.
  return {
    ...base,
    headline: '—',
    title: 'AutoCore',
    detail: 'Open the app to refresh.',
    symbol: 'arrow.triangle.2.circlepath',
    accent: '#8E8E93',
    urgent: false,
  };
}

/** Skip-redundant guard — `updatedAtMs` is excluded so the clock alone never reloads a widget. */
export function widgetSnapshotKey(props: Record<string, unknown>): string {
  return Object.keys(props)
    .filter((key) => key !== 'updatedAtMs')
    .sort()
    .map((key) => `${key}=${String(props[key])}`)
    .join('|');
}
