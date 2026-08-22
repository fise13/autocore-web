import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { financeMetricHref } from '@/features/finance/navigation';

import type { HomeMetric, HomeMetricFamily, HomePermissions, HomeViewModel } from '../types';
import {
  deserializeHomeViewModel,
  restoreHomeFromCache,
  serializeHomeViewModel,
  shouldPersistHomeBrief,
  type RestoredHomeBrief,
} from './home-snapshot';
import { resolveHomeWindows } from './period';

const NOW = new Date('2026-08-20T10:00:00.000Z');
const WINDOWS = resolveHomeWindows('7d', NOW);

const FULL_PERMISSIONS: HomePermissions = {
  canViewMoney: true,
  canViewOrders: true,
  canViewInventory: true,
  canViewMotors: true,
  canViewIntake: true,
  canViewEarnings: true,
  canCustomize: false,
  ordersScope: 'company',
};

function metric(id: HomeMetric['id'], family: HomeMetricFamily): HomeMetric {
  return {
    id,
    family,
    title: id,
    value: 7,
    displayValue: '7',
    unit: 'count',
    periodLabel: 'Now',
    polarity: 'neutral',
    comparison: null,
    trendSeries: [
      { label: 'Mon', value: 1 },
      { label: 'Tue', value: 4 },
      { label: 'Wed', value: 2 },
      { label: 'Thu', value: 7 },
    ],
    note: null,
    scores: {
      businessImportance: 0,
      urgency: 0,
      anomaly: 0,
      changeSignificance: 0,
      recency: 0,
      roleRelevance: 0,
      userPreference: 0,
      dataQuality: 0.9,
    },
    relevanceScore: 0.5,
    destination: { pathname: '/orders' },
    unavailableReason: null,
  };
}

function model(overrides: Partial<HomeViewModel> = {}): HomeViewModel {
  return {
    meta: {
      companyId: 'c1',
      generatedAt: NOW,
      offline: false,
      dataQualityOverall: 'ok',
      summaryPeriod: WINDOWS.period,
      trendPeriod: WINDOWS.period,
      ready: true,
      fromCache: false,
      lastSyncedAt: NOW.getTime(),
    },
    context: {
      organizationName: 'Northgate Motors',
      locationLabel: null,
      dateLabel: 'Thursday, 20 August',
      offlineBanner: null,
    },
    summary: [metric('money.revenue', 'money'), metric('orders.open', 'orders')],
    summaryNote: null,
    trends: [
      {
        id: 'trend:money.revenue',
        metricId: 'money.revenue',
        title: 'Revenue',
        unit: 'currency',
        explanation: 'Revenue is 34% higher than the previous 7 days.',
        direction: 'up',
        deltaPercent: 34,
        significance: 'notable',
        tone: 'positive',
        comparisonLabel: 'vs previous 7 days',
        series: [
          { label: 'Mon', value: 1 },
          { label: 'Tue', value: 4 },
        ],
        values: { current: 100, previous: 80, baseline: 40 },
        destination: {
          pathname: financeMetricHref('revenue').pathname as string,
          params: financeMetricHref('revenue').params as Record<string, string>,
        },
      },
    ],
    trendsAvailable: true,
    attention: [
      {
        id: 'parts.low_stock',
        severity: 'warning',
        title: '3 parts below reorder level',
        explanation: 'Restock before a job stalls waiting on the shelf.',
        count: 3,
        action: 'Review stock',
        urgency: 0.7,
        destination: { pathname: '/warehouse', params: { lowStock: '1' } },
        dismissible: false,
      },
    ],
    quickActions: [{ id: 'scan', title: 'Scan', href: '/(tabs)/scan' }],
    activity: [
      {
        id: 'w1',
        title: '№1',
        detail: 'Hyundai',
        timeLabel: '5 Jul, 15:22',
        statusLabel: 'Delivered',
        statusTone: 'success',
        category: 'order',
        destination: { pathname: '/orders/w1' },
      },
    ],
    permissions: FULL_PERMISSIONS,
    role: 'owner',
    ...overrides,
  };
}

function brief(overrides: Partial<HomeViewModel> = {}, savedAt = NOW.getTime()): RestoredHomeBrief {
  return { model: model(overrides), savedAt };
}

/** A live model that has not finished loading — what Home has on a cold open. */
function loading(permissions: HomePermissions = FULL_PERMISSIONS): HomeViewModel {
  return model({
    meta: { ...model().meta, ready: false, lastSyncedAt: null, dataQualityOverall: 'partial' },
    summary: [],
    trends: [],
    trendsAvailable: false,
    attention: [],
    activity: [],
    quickActions: [{ id: 'new-order', title: 'New order', href: '/orders/new' }],
    permissions,
  });
}

describe('home brief serialization', () => {
  it('survives a round trip through storage', () => {
    const original = model();
    const restored = deserializeHomeViewModel(
      JSON.parse(JSON.stringify(serializeHomeViewModel(original))),
    );

    assert.deepEqual(restored.summary, original.summary);
    assert.deepEqual(restored.trends, original.trends);
    assert.deepEqual(restored.activity, original.activity);
  });

  it('brings dates back as dates, not as the strings JSON made of them', () => {
    const restored = deserializeHomeViewModel(
      JSON.parse(JSON.stringify(serializeHomeViewModel(model()))),
    );

    assert.ok(restored.meta.generatedAt instanceof Date);
    assert.ok(restored.meta.trendPeriod.start instanceof Date);
    assert.ok(restored.meta.trendPeriod.buckets[0].start instanceof Date);
    assert.equal(restored.meta.generatedAt.getTime(), NOW.getTime());
  });

  it('keeps human-formatted strings exactly as written', () => {
    const restored = deserializeHomeViewModel(
      JSON.parse(JSON.stringify(serializeHomeViewModel(model()))),
    );

    // A generic date reviver would be tempted by these; the epoch encoding is
    // what keeps them intact.
    assert.equal(restored.activity[0].timeLabel, '5 Jul, 15:22');
    assert.equal(restored.context.dateLabel, 'Thursday, 20 August');
  });
});

describe('restoring a brief', () => {
  it('shows the saved content instead of an empty screen', () => {
    const restored = restoreHomeFromCache(loading(), brief());

    assert.equal(restored.summary.length, 2);
    assert.equal(restored.trends.length, 1);
    assert.equal(restored.activity.length, 1);
    assert.equal(restored.attention.length, 1);
  });

  it('keeps the charts, which is the part that was blank longest', () => {
    const restored = restoreHomeFromCache(loading(), brief());

    assert.ok((restored.summary[0].trendSeries?.length ?? 0) > 1);
    assert.ok((restored.trends[0].series?.length ?? 0) > 1);
  });

  it('never passes a saved brief off as live', () => {
    const savedAt = NOW.getTime() - 3_600_000;
    const restored = restoreHomeFromCache(loading(), brief({}, savedAt));

    assert.equal(restored.meta.fromCache, true);
    assert.equal(restored.meta.dataQualityOverall, 'stale');
    assert.equal(restored.meta.lastSyncedAt, savedAt);
  });

  it('takes today from the live model, not from the day the brief was saved', () => {
    const live = loading();
    live.context = { ...live.context, dateLabel: 'Saturday, 22 August' };

    const restored = restoreHomeFromCache(live, brief());

    assert.equal(restored.context.dateLabel, 'Saturday, 22 August');
  });

  it('drops metrics the reader may no longer see', () => {
    const restored = restoreHomeFromCache(
      loading({ ...FULL_PERMISSIONS, canViewMoney: false }),
      brief(),
    );

    assert.deepEqual(
      restored.summary.map((entry) => entry.id),
      ['orders.open'],
    );
    assert.deepEqual(restored.trends, []);
  });

  it('drops activity when work orders are no longer visible', () => {
    const restored = restoreHomeFromCache(
      loading({ ...FULL_PERMISSIONS, canViewOrders: false }),
      brief(),
    );

    assert.deepEqual(restored.activity, []);
  });

  it('takes permissions and role from the live session only', () => {
    const live = loading({ ...FULL_PERMISSIONS, canViewMoney: false });
    live.role = 'mechanic';

    const restored = restoreHomeFromCache(live, brief());

    assert.equal(restored.permissions.canViewMoney, false);
    assert.equal(restored.role, 'mechanic');
  });

  it('resolves quick actions live, never from the brief', () => {
    const restored = restoreHomeFromCache(loading(), brief());

    // Restoring a shortcut into a flow the reader can no longer start is worse
    // than showing one fewer shortcut.
    assert.deepEqual(
      restored.quickActions.map((action) => action.id),
      ['new-order'],
    );
  });

  it('keeps the windows the saved numbers were actually measured over', () => {
    const older = resolveHomeWindows('30d', new Date('2026-08-19T10:00:00.000Z'));
    const restored = restoreHomeFromCache(
      loading(),
      brief({
        meta: { ...model().meta, summaryPeriod: older.period, trendPeriod: older.period },
      }),
    );

    assert.equal(restored.meta.trendPeriod.id, '30d');
    assert.equal(restored.meta.summaryPeriod.id, '30d');
  });
});

describe('what is worth keeping', () => {
  it('saves a loaded, live brief', () => {
    assert.equal(shouldPersistHomeBrief(model()), true);
  });

  it('refuses a half-loaded one, which is the blank screen it exists to prevent', () => {
    assert.equal(shouldPersistHomeBrief(loading()), false);
  });

  it('refuses to let a restored brief copy itself forward', () => {
    const restored = restoreHomeFromCache(loading(), brief());
    assert.equal(shouldPersistHomeBrief(restored), false);
  });
});
