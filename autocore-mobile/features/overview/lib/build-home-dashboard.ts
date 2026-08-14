import type { EngineIntakeJob } from '@autocore/engine-intake';

import { coerceToDate } from '@/lib/firestore-timestamp';
import { isMotorStale } from '@/lib/inventory/is-low-stock';
import { isOpenStatus } from '@/lib/work-order/work-order-utils';
import type { InventoryItem } from '@/types/inventory';
import type { MotorEntity } from '@/types/motor';
import type { WorkOrder } from '@/types/work-order';

import type { OverviewActivity, OverviewRevenue } from '../types';
import type {
  HomeActivityRow,
  HomeAiInsight,
  HomeAttentionRow,
  HomeHealthCard,
  HomeNow,
  HomeToday,
  HomeTrend,
} from '../types-home';
import { formatActivityTime } from '../utils/relative-time';

const WEEKDAY = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

const ACTIVE_INTAKE: ReadonlySet<string> = new Set([
  'open',
  'in_session',
  'paused',
  'rework',
  'awaiting_verification',
]);

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function countOrdersCreatedOnDay(orders: WorkOrder[], day: Date): number {
  return orders.filter((order) => {
    const created = coerceToDate(order.createdAt);
    return created ? isSameDay(created, day) : false;
  }).length;
}

function countMotorsArrivedOnDay(motors: MotorEntity[], day: Date): number {
  return motors.filter((motor) => {
    const when = coerceToDate(motor.arrivalDate) ?? coerceToDate(motor.createdAt);
    return when ? isSameDay(when, day) : false;
  }).length;
}

function remainingImportantViews(job: EngineIntakeJob): number {
  const required = job.requirements.filter((r) => r.required).length;
  const captured = job.progress?.capturedCount ?? 0;
  return Math.max(0, required - captured);
}

/** Short uppercase tokens without engine code are usually AI noise, not identity. */
function looksLikeGarbageIdentity(brand: string | undefined, engine: string | undefined): boolean {
  if (engine?.trim()) return false;
  const b = brand?.trim() ?? '';
  if (!b) return true;
  if (b.length <= 5 && /^[A-Z0-9]+$/.test(b)) return true;
  return false;
}

function humanEngineLabel(job: EngineIntakeJob): string {
  const serial = job.expectedIdentity.serialCode?.trim();
  if (serial) return serial;
  const engine = job.expectedIdentity.engineCode?.trim();
  if (engine) return engine;
  const brand = job.expectedIdentity.brandName?.trim();
  if (brand && !looksLikeGarbageIdentity(brand, undefined)) return brand;
  return 'Engine';
}

function resolveIntakeIdentity(job: EngineIntakeJob): { serial: string; meta: string } {
  const identity = job.expectedIdentity;
  const serial = identity.serialCode?.trim() || '—';
  const brand = identity.brandName?.trim();
  const engine = identity.engineCode?.trim();
  const unconfirmed = !job.identityConfirmation || Boolean(job.identityMismatch);

  if (looksLikeGarbageIdentity(brand, engine)) {
    return {
      serial,
      meta: unconfirmed ? 'Identity not confirmed' : 'Identity unconfirmed',
    };
  }

  const meta = [brand, engine].filter(Boolean).join(' · ');
  return { serial, meta: meta || (unconfirmed ? 'Identity not confirmed' : 'Engine') };
}

function daysSince(date: Date | null | undefined, now: Date): number | null {
  if (!date) return null;
  const ms = now.getTime() - date.getTime();
  if (!Number.isFinite(ms) || ms < 0) return 0;
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

export function buildHomeNow(params: {
  jobs: EngineIntakeJob[];
  openOrders: number;
  canIntake: boolean;
}): HomeNow {
  const { jobs, openOrders, canIntake } = params;
  const active = jobs.filter((j) => ACTIVE_INTAKE.has(j.state));
  const inSession = active
    .filter((j) => j.assignment.activeSessionId || j.state === 'in_session' || j.state === 'paused')
    .sort((a, b) => {
      const aT = coerceToDate(a.updatedAt)?.getTime() ?? 0;
      const bT = coerceToDate(b.updatedAt)?.getTime() ?? 0;
      return bT - aT;
    });

  const focus = inSession[0] ?? active[0];
  if (focus && canIntake) {
    const { serial, meta } = resolveIntakeIdentity(focus);
    const captured = focus.progress?.capturedCount ?? 0;
    const remaining = remainingImportantViews(focus);
    return {
      kind: 'intake',
      eyebrow: 'Now',
      title: 'Engine intake',
      serial,
      meta,
      photosLabel: `${captured} photo${captured === 1 ? '' : 's'}`,
      remainingLabel:
        remaining > 0 ? `${remaining} important view${remaining === 1 ? '' : 's'} remaining` : null,
      cta: 'Continue',
      href: `/intake/${focus.id}`,
    };
  }

  if (active.length > 0 || openOrders > 0) {
    const lines: string[] = [];
    if (active.length > 0) {
      lines.push(
        `${active.length} engine${active.length === 1 ? '' : 's'} in documentation`,
      );
    }
    if (openOrders > 0) {
      lines.push(`${openOrders} order${openOrders === 1 ? '' : 's'} open`);
    }
    return {
      kind: 'summary',
      eyebrow: 'Now',
      title: lines[0] ?? 'Active work',
      lines: lines.slice(1),
      cta: canIntake ? 'Open intake' : 'View Work',
      href: canIntake ? '/intake' : '/(tabs)/work',
    };
  }

  return {
    kind: 'clear',
    eyebrow: 'Now',
    title: "You're all caught up.",
    detail: 'Nothing needs your attention right now.',
    cta: canIntake ? 'Start receiving' : 'Open Work',
    href: canIntake ? '/intake' : '/(tabs)/work',
  };
}

function buildWeekSeries(params: {
  motorsEnabled: boolean;
  motors: MotorEntity[];
  orders: WorkOrder[];
  now: Date;
}): { points: HomeTrend['points']; todayValue: number; weekTotal: number; weekAverage: number } {
  const points: HomeTrend['points'] = [];
  let todayValue = 0;
  let weekTotal = 0;

  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(params.now);
    day.setDate(day.getDate() - offset);
    const value = params.motorsEnabled
      ? countMotorsArrivedOnDay(params.motors, day)
      : countOrdersCreatedOnDay(params.orders, day);
    points.push({ label: WEEKDAY[day.getDay()] ?? '', value });
    weekTotal += value;
    if (offset === 0) todayValue = value;
  }

  return {
    points,
    todayValue,
    weekTotal,
    weekAverage: Math.round((weekTotal / 7) * 10) / 10,
  };
}

function todayInsight(params: {
  todayValue: number;
  weekAverage: number;
  noun: string;
}): string {
  if (params.weekAverage <= 0 && params.todayValue === 0) {
    return `No ${params.noun} yet today.`;
  }
  if (params.weekAverage <= 0) {
    return `You have ${params.todayValue} ${params.noun} today.`;
  }
  if (params.todayValue < params.weekAverage) {
    return `You are below your usual pace for ${params.noun} by this point.`;
  }
  if (params.todayValue > params.weekAverage) {
    return `You are ahead of your usual pace for ${params.noun}.`;
  }
  return `You are on pace with your usual ${params.noun} activity.`;
}

function trendInsight(params: {
  todayValue: number;
  weekAverage: number;
  weekTotal: number;
  motors: boolean;
}): string {
  const subject = params.motors ? 'engines received' : 'orders created';
  if (params.weekTotal === 0) {
    return params.motors
      ? 'No engines received over the last 7 days.'
      : 'No orders created over the last 7 days.';
  }
  if (params.todayValue > params.weekAverage * 1.15) {
    return `Your ${subject} are up versus the last 7 days.`;
  }
  if (params.todayValue < params.weekAverage * 0.85) {
    return `Your ${subject} have slowed versus the last 7 days.`;
  }
  return `Your ${subject} have been steady over the last 7 days.`;
}

export function buildHomeToday(params: {
  ordersToday: number;
  receivedToday: number;
  readyToSell: number;
  openOrders: number;
  showOrders: boolean;
  showMotors: boolean;
  showInventory: boolean;
  motors: MotorEntity[];
  orders: WorkOrder[];
  now: Date;
}): HomeToday {
  const facts: HomeToday['facts'] = [];
  const seriesMotors = params.showMotors;
  const series = buildWeekSeries({
    motorsEnabled: seriesMotors,
    motors: params.motors,
    orders: params.orders,
    now: params.now,
  });

  if (params.showMotors) {
    facts.push({
      id: 'received',
      text: `${params.receivedToday} engine${params.receivedToday === 1 ? '' : 's'} received`,
      href: '/intake',
    });
    facts.push({
      id: 'ready',
      text: `${params.readyToSell} ready for sale`,
      href: '/search',
    });
  } else if (params.showInventory) {
    facts.push({
      id: 'stock',
      text: `${params.readyToSell} item${params.readyToSell === 1 ? '' : 's'} in stock`,
      href: '/warehouse',
    });
  }

  if (params.showOrders && params.openOrders > 0) {
    facts.push({
      id: 'open',
      text: `${params.openOrders} order${params.openOrders === 1 ? '' : 's'} open`,
      href: '/orders',
    });
  }

  const compare =
    series.weekAverage > 0
      ? {
          value: Math.round(series.weekAverage),
          label: '7-day avg',
        }
      : null;

  if (params.showOrders) {
    return {
      category: 'Orders',
      sf: 'doc.text.fill',
      accent: 'orange',
      insight: todayInsight({
        todayValue: params.ordersToday,
        weekAverage: series.weekAverage,
        noun: 'orders',
      }),
      primary: {
        value: params.ordersToday,
        label: params.ordersToday === 1 ? 'order' : 'orders',
        href: '/orders',
      },
      compare,
      points: series.points,
      facts: facts.filter((f) => f.id !== 'open' || params.openOrders > 0).slice(0, 3),
      meta: 'Today',
    };
  }

  if (params.showMotors) {
    return {
      category: 'Engines',
      sf: 'gearshape.2.fill',
      accent: 'orange',
      insight: todayInsight({
        todayValue: params.receivedToday,
        weekAverage: series.weekAverage,
        noun: 'engines',
      }),
      primary: {
        value: params.receivedToday,
        label: params.receivedToday === 1 ? 'received' : 'received',
        href: '/intake',
      },
      compare,
      points: series.points,
      facts: facts.filter((f) => f.id !== 'received').slice(0, 3),
      meta: 'Today',
    };
  }

  return {
    category: params.showInventory ? 'Inventory' : 'Today',
    sf: 'shippingbox.fill',
    accent: 'blue',
    insight:
      params.readyToSell > 0
        ? `${params.readyToSell} item${params.readyToSell === 1 ? '' : 's'} available in the workspace.`
        : 'No stock activity yet today.',
    primary: {
      value: params.readyToSell,
      label: params.showInventory ? 'in stock' : 'items',
      href: params.showInventory ? '/warehouse' : '/(tabs)/work',
    },
    compare: null,
    points: series.points,
    facts: facts.slice(0, 3),
    meta: 'Today',
  };
}

export function buildHomeTrend(params: {
  motorsEnabled: boolean;
  motors: MotorEntity[];
  orders: WorkOrder[];
  now: Date;
}): HomeTrend {
  const series = buildWeekSeries(params);
  const motors = params.motorsEnabled;
  const isEmpty = series.weekTotal === 0 && series.todayValue === 0;

  return {
    title: motors ? 'Engines received' : 'Orders created',
    insight: trendInsight({
      todayValue: series.todayValue,
      weekAverage: series.weekAverage,
      weekTotal: series.weekTotal,
      motors,
    }),
    value: series.todayValue,
    valueLabel:
      series.todayValue === 1
        ? motors
          ? 'engine received today'
          : 'order created today'
        : motors
          ? 'engines received today'
          : 'orders created today',
    timeframeLabel: '7-day activity',
    emptyLabel: motors ? 'No engines received today.' : 'No orders created today.',
    weekAverage: series.weekAverage,
    points: series.points,
    isEmpty,
    href: motors ? '/intake' : '/orders',
    accent: motors ? 'blue' : 'orange',
      sf: motors ? 'gearshape.2.fill' : 'doc.text.fill',
  };
}

export function buildOperationalHealth(params: {
  motorsEnabled: boolean;
  availableMotors: MotorEntity[];
  jobs: EngineIntakeJob[];
  items: InventoryItem[];
  openOrders: number;
  newOrdersToday: number;
  inProgressOrders: number;
  revenueToday: number | null;
  showOrders: boolean;
  showFinance: boolean;
}): HomeHealthCard[] {
  const cards: HomeHealthCard[] = [];
  const documenting = params.jobs.filter((j) => ACTIVE_INTAKE.has(j.state));
  const needsPhotos = documenting.filter((j) => remainingImportantViews(j) > 0).length;
  const stalled = documenting.filter((j) => j.state === 'paused' || j.state === 'rework').length;
  const ready = params.availableMotors.length;

  if (params.motorsEnabled) {
    cards.push({
      id: 'docs',
      title: 'Documentation',
      primary:
        documenting.length > 0
          ? `${documenting.length} in intake`
          : `${ready} engine${ready === 1 ? '' : 's'} ready`,
      facts: [
        `${ready} engine${ready === 1 ? '' : 's'} ready`,
        `${needsPhotos} need${needsPhotos === 1 ? 's' : ''} photos`,
        `${stalled} stalled`,
      ],
      href: '/intake',
      tone: needsPhotos > 0 || stalled > 0 ? 'warning' : 'default',
      accent: needsPhotos > 0 || stalled > 0 ? 'yellow' : 'blue',
      sf: 'doc.viewfinder',
      meta: 'Today',
    });

    cards.push({
      id: 'warehouse',
      title: 'Warehouse',
      primary: `${params.availableMotors.length} engine${params.availableMotors.length === 1 ? '' : 's'}`,
      facts: [`${documenting.length} in intake`, `${ready} available`],
      href: '/search',
      accent: 'green',
      sf: 'shippingbox.fill',
      meta: 'Now',
    });
  } else if (params.items.length > 0) {
    cards.push({
      id: 'stock',
      title: 'Inventory',
      primary: `${params.items.length} item${params.items.length === 1 ? '' : 's'}`,
      facts: [`${params.items.length} in catalog`],
      href: '/warehouse',
      accent: 'green',
      sf: 'shippingbox.fill',
      meta: 'Now',
    });
  }

  if (params.showOrders) {
    const facts = [
      `${params.newOrdersToday} new`,
      `${params.inProgressOrders} in progress`,
    ];
    if (params.showFinance && params.revenueToday != null) {
      facts.push(`$${Math.round(params.revenueToday).toLocaleString('en-US')} today`);
    }
    cards.push({
      id: 'orders',
      title: 'Orders',
      primary: `${params.openOrders} open`,
      facts,
      href: '/orders',
      accent: 'orange',
      sf: 'doc.text.fill',
      meta: 'Today',
    });
  }

  return cards.slice(0, 3);
}

export function buildAttentionRows(params: {
  jobs: EngineIntakeJob[];
  waitingParts: number;
  lowStock: number;
  staleMotors: number;
  canIntake: boolean;
  pendingPayouts?: number;
  claimableJobs?: number;
}): HomeAttentionRow[] {
  const rows: HomeAttentionRow[] = [];

  if ((params.pendingPayouts ?? 0) > 0) {
    rows.push({
      id: 'payouts-waiting',
      title: params.pendingPayouts === 1 ? 'Payout waiting' : 'Payouts waiting',
      subtitle: `${params.pendingPayouts} to collect`,
      tone: 'warning',
      actionLabel: 'Open',
      href: '/earnings',
    });
  }
  if ((params.claimableJobs ?? 0) > 0) {
    rows.push({
      id: 'jobs-to-claim',
      title: 'Jobs to claim',
      subtitle: `${params.claimableJobs} in the pool`,
      tone: 'info',
      actionLabel: 'Open',
      href: '/earnings',
    });
  }

  for (const job of params.jobs) {
    const label = humanEngineLabel(job);

    if (job.identityMismatch) {
      rows.push({
        id: `mismatch-${job.id}`,
        title: 'Serial needs confirmation',
        subtitle: label,
        tone: 'critical',
        actionLabel: 'Review',
        href: `/intake/${job.id}`,
      });
    } else if (
      looksLikeGarbageIdentity(job.expectedIdentity.brandName, job.expectedIdentity.engineCode) &&
      ACTIVE_INTAKE.has(job.state)
    ) {
      rows.push({
        id: `identity-${job.id}`,
        title: 'AI identity uncertain',
        subtitle: label,
        tone: 'warning',
        actionLabel: 'Review',
        href: `/intake/${job.id}`,
      });
    } else if (ACTIVE_INTAKE.has(job.state) && remainingImportantViews(job) > 0 && params.canIntake) {
      rows.push({
        id: `photos-${job.id}`,
        title: 'Intake missing photos',
        subtitle: label,
        tone: 'warning',
        actionLabel: 'Continue',
        href: `/intake/${job.id}`,
      });
    }
    if (rows.length >= 5) break;
  }

  if (params.waitingParts > 0 && rows.length < 5) {
    rows.push({
      id: 'waiting-parts',
      title: 'Waiting on parts',
      subtitle: `${params.waitingParts} order${params.waitingParts === 1 ? '' : 's'}`,
      tone: 'warning',
      actionLabel: 'Review',
      href: '/orders',
    });
  }
  if (params.lowStock > 0 && rows.length < 5) {
    rows.push({
      id: 'low-stock',
      title: 'Low stock',
      subtitle: `${params.lowStock} item${params.lowStock === 1 ? '' : 's'}`,
      tone: 'warning',
      actionLabel: 'Review',
      href: '/warehouse',
    });
  }
  if (params.staleMotors > 0 && rows.length < 5) {
    rows.push({
      id: 'stale',
      title: 'Idle engines',
      subtitle: `${params.staleMotors} without movement`,
      tone: 'info',
      actionLabel: 'Review',
      href: '/search',
    });
  }

  return rows.slice(0, 5);
}

export function buildAiInsight(params: {
  jobs: EngineIntakeJob[];
  now: Date;
  outboxSyncing: boolean;
  outboxPending: number;
  canIntake: boolean;
}): HomeAiInsight {
  const documenting = params.jobs.filter((j) => ACTIVE_INTAKE.has(j.state));
  if (documenting.length > 0 && params.canIntake) {
    const oldest = documenting
      .map((j) => ({ job: j, at: coerceToDate(j.createdAt) ?? coerceToDate(j.updatedAt) }))
      .sort((a, b) => (a.at?.getTime() ?? 0) - (b.at?.getTime() ?? 0))[0];
    const age = daysSince(oldest?.at, params.now);
    const ageBit =
      age == null
        ? ''
        : age === 0
          ? ' The newest arrived today.'
          : age === 1
            ? ' The oldest has been in intake for 1 day.'
            : ` The oldest has been in intake for ${age} days.`;

    return {
      title: 'AI insight',
      body: `${documenting.length} engine${documenting.length === 1 ? ' is' : 's are'} waiting for documentation.${ageBit}`,
      cta: 'Review',
      href: oldest ? `/intake/${oldest.job.id}` : '/intake',
    };
  }

  if (params.outboxSyncing || params.outboxPending > 0) {
    return {
      title: 'AI noticed',
      body: params.outboxSyncing
        ? params.outboxPending > 0
          ? `${params.outboxPending} intake item${params.outboxPending === 1 ? '' : 's'} being analyzed.`
          : 'Analyzing engine photos…'
        : `${params.outboxPending} intake item${params.outboxPending === 1 ? '' : 's'} waiting to sync.`,
      cta: 'Open intake',
      href: '/intake',
    };
  }

  return null;
}

export function mapActivityRows(items: OverviewActivity[]): HomeActivityRow[] {
  return items.slice(0, 6).map((item) => ({
    id: item.id,
    object: item.title,
    event: [item.statusLabel, item.detail].filter(Boolean).join(' · ') || item.statusLabel,
    time: item.time,
    tone: item.statusTone,
    href: `/orders/${item.id}`,
  }));
}

export function countTodayOrders(orders: WorkOrder[], now: Date): number {
  return countOrdersCreatedOnDay(orders, now);
}

export function countTodayMotors(motors: MotorEntity[], now: Date): number {
  return countMotorsArrivedOnDay(motors, now);
}

export function countOpenOrders(orders: WorkOrder[]): number {
  return orders.filter((o) => isOpenStatus(o.status)).length;
}

export function countInProgressOrders(orders: WorkOrder[]): number {
  return orders.filter((o) => o.status === 'in_progress' || o.status === 'confirmed').length;
}

export function countStaleMotors(motors: MotorEntity[]): number {
  return motors.filter(
    (m) => !m.soldDate && (m.status ?? 'available') === 'available' && isMotorStale(m),
  ).length;
}

export function formatRelativeNow(date: Date, now = new Date()): string {
  return formatActivityTime(date, now);
}

export function revenueTodayHint(revenue: OverviewRevenue): number | null {
  if (typeof revenue.todayNet === 'number') return revenue.todayNet;
  if (typeof revenue.todayIncome === 'number') return revenue.todayIncome;
  return null;
}
