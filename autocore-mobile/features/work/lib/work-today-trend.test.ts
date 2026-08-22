import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { InventoryItem } from '@/types/inventory';
import type { WorkOrder } from '@/types/work-order';

import {
  attentionLoadAt,
  buildHealthChartPoints,
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

describe('buildHealthChartPoints', () => {
  it('puts a graph under the long average when the left raw weeks are empty', () => {
    const weekly = [...Array(10).fill(0), ...Array(8).fill(650)];
    const longAvg = Math.round(weekly.reduce((a, b) => a + b, 0) / weekly.length);
    const shortAvg = 650;
    const chart = buildHealthChartPoints(weekly, longAvg, shortAvg);
    const left = chart.slice(0, 10);
    const right = chart.slice(10);
    assert.ok(mean(left) > longAvg * 0.9);
    assert.ok(mean(left) < longAvg * 1.1);
    assert.ok(mean(right) > shortAvg * 0.9);
  });
});

describe('buildWorkTodayTrend', () => {
  it('exposes chartPoints aligned to long and short averages', () => {
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

    assert.equal(trend.chartPoints.length, WORK_TODAY_LONG_WEEKS);
    assert.ok(trend.shortAverage > trend.longAverage);
    const leftChart = trend.chartPoints.slice(0, 10);
    assert.ok(mean(leftChart) > trend.longAverage * 0.85);
  });
});
