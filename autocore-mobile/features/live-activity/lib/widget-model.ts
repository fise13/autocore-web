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
import { EN_WIDGET_COPY, type WidgetCopy } from './widget-copy';
import { WIDGET_URL } from './widget-links';

/** Same reasoning as `LiveActivitySymbol` — literals, so `Image systemName` typechecks. */
export type TodayWidgetSymbol =
  | 'shippingbox.fill'
  | 'wrench.and.screwdriver.fill'
  | 'exclamationmark.triangle.fill'
  | 'checkmark.circle.fill'
  | 'engine.combustion.fill'
  | 'arrow.triangle.2.circlepath'
  | 'banknote.fill'
  | 'camera.fill';

export type IntakeBayWidgetSymbol =
  | 'checkmark.seal.fill'
  | 'camera.fill'
  | 'arrow.triangle.2.circlepath'
  | 'engine.combustion.fill';

export type WorkWidgetSymbol =
  | 'wrench.and.screwdriver.fill'
  | 'exclamationmark.triangle.fill'
  | 'checkmark.circle.fill'
  | 'arrow.triangle.2.circlepath';

export type WarehouseWidgetSymbol =
  | 'shippingbox.fill'
  | 'barcode.viewfinder'
  | 'exclamationmark.triangle.fill'
  | 'engine.combustion.fill'
  | 'checkmark.circle.fill'
  | 'arrow.triangle.2.circlepath';

/** A count the app has not yet loaded. Rendered as an em dash. */
export const UNKNOWN_COUNT = -1;

/** Documenting — matches the bay Active tab states, company-wide. */
const INTAKE_ACTIVE_STATES = new Set(['open', 'in_session', 'paused', 'rework']);
/** In review — matches the bay Ready tab / web verification queue. */
const INTAKE_READY_STATES = new Set(['awaiting_verification', 'quarantine']);
/** Work row "awaiting" — engines sitting in the bay waiting to be picked up. */
const INTAKE_AWAITING_STATES = new Set(['open', 'rework']);

export type SyncWidgetProps = {
  status: SyncStatus;
  /** "Syncing 8 of 18" */
  title: string;
  /** "10 photos left" */
  detail: string;
  /** "8/18" — the accessoryCircular / accessoryInline numeral. */
  short: string;
  caption: string;
  /** Lock Screen inline line — decided here, not in the layout. */
  inlineText: string;
  /** Home footer when there is no progress bar. */
  footer: string;
  link: string;
  openLabel: string;
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
  /** Payroll rows waiting to be paid. */
  earningsPending: number;
  /** Open jobs this person can claim. */
  earningsClaimable: number;
  /** Intake jobs waiting to be picked up (`open` / `rework`). */
  intakeAwaiting: number;
};

export type TodayWidgetProps = TodayWidgetCounts & {
  /** Big numeral for systemSmall / accessoryCircular. */
  headline: string;
  /** One line describing what most needs a person. */
  title: string;
  detail: string;
  eyebrow: string;
  ordersLabel: string;
  placeLabel: string;
  enginesLabel: string;
  link: string;
  symbol: TodayWidgetSymbol;
  accent: string;
  /** True when at least one count wants attention today. */
  urgent: boolean;
  updatedAtMs: number;
};

export type IntakeBayWidgetCounts = {
  /** Engines documenting (open / in_session / paused / rework). */
  active: number;
  /** Engines waiting for verification. */
  ready: number;
  /** Photos still on the phone. */
  syncing: number;
};

export type IntakeBayWidgetProps = IntakeBayWidgetCounts & {
  headline: string;
  title: string;
  detail: string;
  eyebrow: string;
  readyLabel: string;
  activeLabel: string;
  openReadyLabel: string;
  continueLabel: string;
  link: string;
  symbol: IntakeBayWidgetSymbol;
  accent: string;
  urgent: boolean;
  updatedAtMs: number;
};

export type WorkWidgetCounts = {
  openOrders: number;
  attentionOrders: number;
};

export type WorkWidgetProps = WorkWidgetCounts & {
  headline: string;
  title: string;
  detail: string;
  eyebrow: string;
  openLabel: string;
  attentionLabel: string;
  actionLabel: string;
  link: string;
  symbol: WorkWidgetSymbol;
  accent: string;
  urgent: boolean;
  updatedAtMs: number;
};

export type WarehouseWidgetCounts = {
  awaitingPlacement: number;
  lowStock: number;
  engines: number;
};

export type WarehouseWidgetProps = WarehouseWidgetCounts & {
  headline: string;
  title: string;
  detail: string;
  eyebrow: string;
  placeLabel: string;
  lowLabel: string;
  enginesLabel: string;
  actionLabel: string;
  actionTarget: 'openScan' | 'openWarehouse';
  link: string;
  symbol: WarehouseWidgetSymbol;
  accent: string;
  urgent: boolean;
  updatedAtMs: number;
};

export const EMPTY_TODAY_COUNTS: TodayWidgetCounts = {
  openOrders: UNKNOWN_COUNT,
  attentionOrders: UNKNOWN_COUNT,
  engines: UNKNOWN_COUNT,
  awaitingPlacement: UNKNOWN_COUNT,
  lowStock: UNKNOWN_COUNT,
  earningsPending: UNKNOWN_COUNT,
  earningsClaimable: UNKNOWN_COUNT,
  intakeAwaiting: UNKNOWN_COUNT,
};

export const EMPTY_INTAKE_BAY_COUNTS: IntakeBayWidgetCounts = {
  active: UNKNOWN_COUNT,
  ready: UNKNOWN_COUNT,
  syncing: UNKNOWN_COUNT,
};

export const EMPTY_WORK_WIDGET_COUNTS: WorkWidgetCounts = {
  openOrders: UNKNOWN_COUNT,
  attentionOrders: UNKNOWN_COUNT,
};

export const EMPTY_WAREHOUSE_WIDGET_COUNTS: WarehouseWidgetCounts = {
  awaitingPlacement: UNKNOWN_COUNT,
  lowStock: UNKNOWN_COUNT,
  engines: UNKNOWN_COUNT,
};

function known(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function dash(value: number): string {
  return known(value) ? String(value) : '—';
}

export function countIntakeBayFromJobs(
  jobs: readonly { state: string }[],
): Pick<IntakeBayWidgetCounts, 'active' | 'ready'> {
  let active = 0;
  let ready = 0;
  for (const job of jobs) {
    if (INTAKE_READY_STATES.has(job.state)) ready += 1;
    else if (INTAKE_ACTIVE_STATES.has(job.state)) active += 1;
  }
  return { active, ready };
}

/** Matches the Work row: engines sitting in the bay waiting to be picked up. */
export function countIntakeAwaitingFromJobs(jobs: readonly { state: string }[]): number {
  let awaiting = 0;
  for (const job of jobs) {
    if (INTAKE_AWAITING_STATES.has(job.state)) awaiting += 1;
  }
  return awaiting;
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
  copy: WidgetCopy = EN_WIDGET_COPY,
): SyncWidgetProps {
  const blocked = summary.status === 'FAILED' || summary.status === 'ACTION_REQUIRED';
  const short = blocked
    ? String(summary.blocked)
    : summary.status === 'SYNCED'
      ? 'All set'
      : summary.progressLabel;
  const detail = summary.detail ?? '';
  const inlineText = blocked
    ? copy.inlineBlocked(summary.blocked)
    : summary.pending > 0
      ? copy.inlineSyncing(short)
      : copy.inlineIntakeSynced;
  return {
    status: summary.status,
    // WidgetKit decides when this redraws, which may be minutes from now. A
    // countdown baked into the title would be wrong by then; a state is not.
    title: summary.status === 'RETRYING' ? copy.waitingToRetry : summary.headline,
    detail,
    short,
    caption: blocked ? 'blocked' : summary.status === 'SYNCED' ? 'synced' : 'photos',
    inlineText,
    footer:
      summary.status === 'SYNCED'
        ? copy.everythingBackedUp
        : detail.length > 0
          ? detail
          : copy.nothingWaiting,
    link: WIDGET_URL.intake,
    openLabel: copy.openIntakeLabel,
    symbol: liveActivitySymbol(summary.status),
    accent: liveActivityAccent(summary.status),
    progress: summary.status === 'SYNCED' ? 1 : summary.progress,
    determinate: summary.status === 'SYNCING' && summary.total > 0,
    pending: summary.pending,
    blocked: summary.blocked,
    updatedAtMs,
  };
}

function todayChrome(copy: WidgetCopy, urgent: boolean, link: string) {
  return {
    eyebrow: urgent ? copy.todayUrgentEyebrow : copy.todayEyebrow,
    ordersLabel: copy.ordersLabel,
    placeLabel: copy.placeLabel,
    enginesLabel: copy.enginesLabel,
    link,
  };
}

/**
 * Ranks the day by what actually blocks someone, hardest first: stock nobody
 * can find, then an order waiting on parts, then low stock, then pay waiting,
 * then engines sitting in the bay, then a plain open order. A widget has one
 * line — it has to spend it on the thing that would otherwise be missed.
 */
export function buildTodayWidgetProps(
  counts: TodayWidgetCounts,
  updatedAtMs: number,
  copy: WidgetCopy = EN_WIDGET_COPY,
): TodayWidgetProps {
  const base = {
    ...counts,
    updatedAtMs,
  };

  if (known(counts.awaitingPlacement) && counts.awaitingPlacement > 0) {
    return {
      ...base,
      ...todayChrome(copy, true, WIDGET_URL.scan),
      headline: String(counts.awaitingPlacement),
      title:
        counts.awaitingPlacement === 1
          ? copy.itemToPlace(1)
          : copy.itemsToPlace(counts.awaitingPlacement),
      detail: copy.placeDetail,
      symbol: 'shippingbox.fill',
      accent: '#FF9F0A',
      urgent: true,
    };
  }

  if (known(counts.attentionOrders) && counts.attentionOrders > 0) {
    return {
      ...base,
      ...todayChrome(copy, true, WIDGET_URL.orders),
      headline: String(counts.attentionOrders),
      title:
        counts.attentionOrders === 1
          ? copy.orderWaiting(1)
          : copy.ordersWaiting(counts.attentionOrders),
      detail: known(counts.openOrders) ? copy.openInTotal(counts.openOrders) : '',
      symbol: 'wrench.and.screwdriver.fill',
      accent: '#FF9F0A',
      urgent: true,
    };
  }

  if (known(counts.lowStock) && counts.lowStock > 0) {
    return {
      ...base,
      ...todayChrome(copy, true, WIDGET_URL.warehouse),
      headline: String(counts.lowStock),
      title: counts.lowStock === 1 ? copy.partLow(1) : copy.partsLow(counts.lowStock),
      detail: copy.belowReorder,
      symbol: 'exclamationmark.triangle.fill',
      accent: '#FF9F0A',
      urgent: true,
    };
  }

  if (known(counts.earningsPending) && counts.earningsPending > 0) {
    return {
      ...base,
      ...todayChrome(copy, true, WIDGET_URL.earnings),
      headline: String(counts.earningsPending),
      title:
        counts.earningsPending === 1
          ? copy.payoutWaiting(1)
          : copy.payoutsWaiting(counts.earningsPending),
      detail:
        known(counts.earningsClaimable) && counts.earningsClaimable > 0
          ? copy.jobsToClaim(counts.earningsClaimable)
          : copy.earningsDetail,
      symbol: 'banknote.fill',
      accent: '#FF9F0A',
      urgent: true,
    };
  }

  if (known(counts.earningsClaimable) && counts.earningsClaimable > 0) {
    return {
      ...base,
      ...todayChrome(copy, true, WIDGET_URL.earnings),
      headline: String(counts.earningsClaimable),
      title:
        counts.earningsClaimable === 1
          ? copy.jobToClaim(1)
          : copy.jobsToClaim(counts.earningsClaimable),
      detail: copy.earningsDetail,
      symbol: 'banknote.fill',
      accent: '#FF9F0A',
      urgent: true,
    };
  }

  if (known(counts.intakeAwaiting) && counts.intakeAwaiting > 0) {
    return {
      ...base,
      ...todayChrome(copy, true, WIDGET_URL.intake),
      headline: String(counts.intakeAwaiting),
      title:
        counts.intakeAwaiting === 1
          ? copy.engineAwaiting(1)
          : copy.enginesAwaiting(counts.intakeAwaiting),
      detail: copy.intakeAwaitingDetail,
      symbol: 'camera.fill',
      accent: '#0A84FF',
      urgent: true,
    };
  }

  if (known(counts.openOrders) && counts.openOrders > 0) {
    return {
      ...base,
      ...todayChrome(copy, false, WIDGET_URL.orders),
      headline: String(counts.openOrders),
      title:
        counts.openOrders === 1 ? copy.openOrder(1) : copy.openOrders(counts.openOrders),
      detail: known(counts.engines) ? copy.enginesInStock(String(counts.engines)) : '',
      symbol: 'wrench.and.screwdriver.fill',
      accent: '#0A84FF',
      urgent: false,
    };
  }

  if (known(counts.openOrders)) {
    return {
      ...base,
      ...todayChrome(copy, false, WIDGET_URL.work),
      headline: '0',
      title: copy.noOpenOrders,
      detail: known(counts.engines)
        ? copy.enginesInStock(String(counts.engines))
        : copy.todayClearDetail,
      symbol: 'checkmark.circle.fill',
      accent: '#30D158',
      urgent: false,
    };
  }

  return {
    ...base,
    ...todayChrome(copy, false, WIDGET_URL.work),
    headline: '—',
    title: copy.brand,
    detail: copy.todayRefresh,
    symbol: 'arrow.triangle.2.circlepath',
    accent: '#8E8E93',
    urgent: false,
  };
}

/**
 * Ready first (Finish just happened), then in-flight photos, then documenting.
 * Circular / small spend the numeral on that ranking.
 */
export function buildIntakeBayWidgetProps(
  counts: IntakeBayWidgetCounts,
  updatedAtMs: number,
  copy: WidgetCopy = EN_WIDGET_COPY,
): IntakeBayWidgetProps {
  const base = {
    ...counts,
    updatedAtMs,
    eyebrow: copy.intakeEyebrow,
    readyLabel: copy.readyLabel,
    activeLabel: copy.activeLabel,
    openReadyLabel: copy.openReadyLabel,
    continueLabel: copy.continueIntakeLabel,
  };

  if (known(counts.ready) && counts.ready > 0) {
    return {
      ...base,
      headline: String(counts.ready),
      title: copy.readyForReview(counts.ready),
      detail: known(counts.active) && counts.active > 0
        ? copy.documenting(counts.active)
        : copy.waitingForReview,
      link: WIDGET_URL.intakeReady,
      symbol: 'checkmark.seal.fill',
      accent: '#30D158',
      urgent: true,
    };
  }

  if (known(counts.syncing) && counts.syncing > 0) {
    return {
      ...base,
      headline: String(counts.syncing),
      title: copy.photosSyncing(counts.syncing),
      detail: known(counts.active)
        ? copy.documenting(counts.active)
        : copy.waitingForReview,
      link: WIDGET_URL.intake,
      symbol: 'arrow.triangle.2.circlepath',
      accent: '#0A84FF',
      urgent: true,
    };
  }

  if (known(counts.active) && counts.active > 0) {
    return {
      ...base,
      headline: String(counts.active),
      title: copy.documenting(counts.active),
      detail: known(counts.ready) ? `${dash(counts.ready)} ${copy.readyLabel}` : '',
      link: WIDGET_URL.intakeActive,
      symbol: 'camera.fill',
      accent: '#0A84FF',
      urgent: false,
    };
  }

  if (known(counts.active) && known(counts.ready)) {
    return {
      ...base,
      headline: '0',
      title: copy.bayClear,
      detail: copy.waitingForReview,
      link: WIDGET_URL.intake,
      symbol: 'engine.combustion.fill',
      accent: '#8E8E93',
      urgent: false,
    };
  }

  return {
    ...base,
    headline: '—',
    title: copy.brand,
    detail: copy.intakeRefresh,
    link: WIDGET_URL.intake,
    symbol: 'arrow.triangle.2.circlepath',
    accent: '#8E8E93',
    urgent: false,
  };
}

export function buildWorkWidgetProps(
  counts: WorkWidgetCounts,
  updatedAtMs: number,
  copy: WidgetCopy = EN_WIDGET_COPY,
): WorkWidgetProps {
  const base = {
    ...counts,
    updatedAtMs,
    eyebrow: copy.workEyebrow,
    openLabel: copy.openCountLabel,
    attentionLabel: copy.attentionLabel,
    actionLabel: copy.openOrdersAction,
    link: WIDGET_URL.orders,
  };

  if (known(counts.attentionOrders) && counts.attentionOrders > 0) {
    return {
      ...base,
      headline: String(counts.attentionOrders),
      title:
        counts.attentionOrders === 1
          ? copy.orderWaiting(1)
          : copy.ordersWaiting(counts.attentionOrders),
      detail: known(counts.openOrders) ? copy.openInTotal(counts.openOrders) : '',
      symbol: 'exclamationmark.triangle.fill',
      accent: '#FF9F0A',
      urgent: true,
    };
  }

  if (known(counts.openOrders) && counts.openOrders > 0) {
    return {
      ...base,
      headline: String(counts.openOrders),
      title:
        counts.openOrders === 1 ? copy.openOrder(1) : copy.openOrders(counts.openOrders),
      detail: copy.workClearDetail,
      symbol: 'wrench.and.screwdriver.fill',
      accent: '#0A84FF',
      urgent: false,
    };
  }

  if (known(counts.openOrders)) {
    return {
      ...base,
      headline: '0',
      title: copy.noOpenOrders,
      detail: copy.workClearDetail,
      symbol: 'checkmark.circle.fill',
      accent: '#30D158',
      urgent: false,
    };
  }

  return {
    ...base,
    headline: '—',
    title: copy.brand,
    detail: copy.workRefresh,
    symbol: 'arrow.triangle.2.circlepath',
    accent: '#8E8E93',
    urgent: false,
  };
}

export function buildWarehouseWidgetProps(
  counts: WarehouseWidgetCounts,
  updatedAtMs: number,
  copy: WidgetCopy = EN_WIDGET_COPY,
): WarehouseWidgetProps {
  const placing = known(counts.awaitingPlacement) && counts.awaitingPlacement > 0;
  const labels = {
    eyebrow: copy.warehouseEyebrow,
    placeLabel: copy.placeLabel,
    lowLabel: copy.lowLabel,
    enginesLabel: copy.enginesLabel,
    actionLabel: placing ? copy.scanAction : copy.openWarehouseAction,
    actionTarget: placing ? ('openScan' as const) : ('openWarehouse' as const),
    link: placing ? WIDGET_URL.scan : WIDGET_URL.warehouse,
  };
  const base = {
    ...counts,
    updatedAtMs,
    ...labels,
  };

  if (placing) {
    return {
      ...base,
      headline: String(counts.awaitingPlacement),
      title:
        counts.awaitingPlacement === 1
          ? copy.itemToPlace(1)
          : copy.itemsToPlace(counts.awaitingPlacement),
      detail: copy.placeDetail,
      symbol: 'shippingbox.fill',
      accent: '#FF9F0A',
      urgent: true,
    };
  }

  if (known(counts.lowStock) && counts.lowStock > 0) {
    return {
      ...base,
      headline: String(counts.lowStock),
      title: counts.lowStock === 1 ? copy.partLow(1) : copy.partsLow(counts.lowStock),
      detail: copy.belowReorder,
      symbol: 'exclamationmark.triangle.fill',
      accent: '#FF9F0A',
      urgent: true,
    };
  }

  if (known(counts.awaitingPlacement) && known(counts.lowStock)) {
    return {
      ...base,
      headline: '0',
      title: copy.warehouseClear,
      detail: known(counts.engines)
        ? copy.enginesInStock(String(counts.engines))
        : copy.todayClearDetail,
      symbol: 'checkmark.circle.fill',
      accent: '#30D158',
      urgent: false,
    };
  }

  return {
    ...base,
    headline: '—',
    title: copy.brand,
    detail: copy.warehouseRefresh,
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
