import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { InventoryItem } from '@/types/inventory';
import type { WorkOrder } from '@/types/work-order';

import {
  attentionLoadAt,
  buildWorkTodayTrend,
  openWorkCountAt,
  WORK_TODAY_LONG_WEEKS,
} from './work-today-trend';

function order(partial: Partial<WorkOrder> & { id: string }): WorkOrder {
  return {
    id: partial.id,
    companyId: 'c1',
    number: partial.number ?? 1,
    status: partial.status ?? 'in_progress',
    createdAt: partial.createdAt,
    updatedAt: partial.updatedAt,
    completedAt: partial.completedAt,
    ...partial,
  } as WorkOrder;
}

function item(partial: Partial<InventoryItem> & { id: string }): InventoryItem {
  return {
    id: partial.id,
    companyId: 'c1',
    type: 'generic',
    sku: partial.sku ?? partial.id,
    name: partial.name ?? partial.id,
    barcodes: [],
    unit: 'pc',
    totalOnHand: partial.totalOnHand ?? 1,
    totalReserved: 0,
    totalAvailable: partial.totalAvailable ?? partial.totalOnHand ?? 1,
    status: 'active',
    primaryLocationCode: partial.primaryLocationCode,
    primaryLocationId: partial.primaryLocationId,
    lowStockThreshold: partial.lowStockThreshold,
    createdAt: partial.createdAt,
    updatedAt: partial.updatedAt,
    ...partial,
  };
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

describe('openWorkCountAt', () => {
  it('counts open orders created before the cutoff', () => {
    const at = new Date('2026-06-01T12:00:00');
    const orders = [
      order({ id: 'a', status: 'in_progress', createdAt: new Date('2026-05-01') }),
      order({
        id: 'b',
        status: 'completed',
        createdAt: new Date('2026-05-01'),
        completedAt: new Date('2026-05-20'),
      }),
      order({ id: 'c', status: 'confirmed', createdAt: new Date('2026-06-15') }),
    ];
    assert.equal(openWorkCountAt(orders, at), 1);
  });

  it('falls back to updatedAt when createdAt is missing', () => {
    const at = new Date('2026-06-01T12:00:00');
    const orders = [
      order({ id: 'a', status: 'in_progress', updatedAt: new Date('2026-05-01') }),
    ];
    assert.equal(openWorkCountAt(orders, at), 1);
  });
});

describe('attentionLoadAt', () => {
  it('includes unplaced and low-stock inventory in the load', () => {
    const at = new Date('2026-08-20T12:00:00');
    const load = attentionLoadAt(
      {
        orders: [],
        items: [
          item({
            id: 'u1',
            primaryLocationCode: 'UNLOCATED',
            totalOnHand: 2,
            totalAvailable: 2,
            createdAt: new Date('2026-01-01'),
          }),
          item({
            id: 'l1',
            totalAvailable: 0,
            lowStockThreshold: 1,
            primaryLocationCode: 'A-1',
            createdAt: new Date('2026-01-01'),
          }),
        ],
        intakeJobs: [],
        earningsAttention: 1,
      },
      at,
    );
    assert.equal(load, 3);
  });

  it('uses createdAt so old stock appears in early weeks', () => {
    const early = new Date('2026-04-01T12:00:00');
    const load = attentionLoadAt(
      {
        orders: [],
        items: [
          item({
            id: 'u1',
            primaryLocationCode: 'UNLOCATED',
            totalOnHand: 1,
            totalAvailable: 5,
            lowStockThreshold: 1,
            createdAt: new Date('2026-01-10'),
            updatedAt: new Date('2026-08-18'),
          }),
        ],
        intakeJobs: [],
        earningsAttention: 0,
      },
      early,
    );
    assert.equal(load, 1);
  });

  it('excludes stock not yet created in early weeks', () => {
    const early = new Date('2026-04-01T12:00:00');
    const load = attentionLoadAt(
      {
        orders: [],
        items: [
          item({
            id: 'new',
            primaryLocationCode: 'UNLOCATED',
            totalOnHand: 1,
            totalAvailable: 5,
            createdAt: new Date('2026-08-01'),
          }),
        ],
        intakeJobs: [],
        earningsAttention: 0,
      },
      early,
    );
    assert.equal(load, 0);
  });
});

describe('buildWorkTodayTrend', () => {
  it('exposes the measured weekly series without reshaping it', () => {
    const now = new Date('2026-08-20T12:00:00');
    const trend = buildWorkTodayTrend(
      {
        orders: [],
        items: [
          ...Array.from({ length: 20 }, (_, i) =>
            item({
              id: `old${i}`,
              primaryLocationCode: 'UNLOCATED',
              totalOnHand: 1,
              totalAvailable: 5,
              createdAt: new Date('2026-01-15'),
            }),
          ),
          ...Array.from({ length: 80 }, (_, i) =>
            item({
              id: `new${i}`,
              primaryLocationCode: 'UNLOCATED',
              totalOnHand: 1,
              totalAvailable: 5,
              createdAt: new Date('2026-07-20'),
            }),
          ),
        ],
        intakeJobs: [],
        earningsAttention: 0,
      },
      now,
    );

    assert.equal(trend.points.length, WORK_TODAY_LONG_WEEKS);
    assert.ok(trend.shortAverage > trend.longAverage);
    // Early weeks see only the 20 older SKUs — the chart plots that step as it
    // happened rather than re-centring each half on its own average.
    assert.deepEqual(trend.points, [...Array(13).fill(20), ...Array(5).fill(100)]);
    assert.equal(trend.longAverage, 42);
    assert.equal(trend.shortAverage, 70);
    assert.equal(Math.round(mean(trend.points.slice(-8))), trend.shortAverage);
  });
});
