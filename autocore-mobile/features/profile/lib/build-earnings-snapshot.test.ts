import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { subDays } from 'date-fns';

import {
  buildEarningsSnapshot,
  formatEarningsDate,
  localDayKey,
  type EarningsPayrollRow,
  type EarningsWorkOrder,
} from './build-earnings-snapshot';

const NOW = new Date('2026-08-13T00:30:00+05:00');

function payroll(partial: Partial<EarningsPayrollRow> & Pick<EarningsPayrollRow, 'id'>): EarningsPayrollRow {
  return {
    amount: 100,
    status: 'pending',
    workOrderId: 'wo-1',
    createdAt: NOW,
    ...partial,
  };
}

function order(
  partial: Partial<EarningsWorkOrder> & Pick<EarningsWorkOrder, 'id' | 'status'>,
): EarningsWorkOrder {
  return {
    number: partial.number ?? '100',
    licensePlate: 'ABC-123',
    vehicleLabel: 'Camry',
    laborLines: [],
    ...partial,
  };
}

describe('localDayKey', () => {
  it('uses the local calendar date, not UTC', () => {
    const expected = `${NOW.getFullYear()}-${String(NOW.getMonth() + 1).padStart(2, '0')}-${String(NOW.getDate()).padStart(2, '0')}`;
    assert.equal(localDayKey(NOW), expected);
  });
});

describe('formatEarningsDate', () => {
  it('says Today for the same local day', () => {
    assert.equal(formatEarningsDate(NOW, NOW), 'Today');
  });
});

describe('buildEarningsSnapshot', () => {
  it('sums pending and paid, and ignores cancelled', () => {
    const snapshot = buildEarningsSnapshot({
      uid: 'mech',
      now: NOW,
      orders: [],
      payroll: [
        payroll({ id: 'a', amount: 120, status: 'pending' }),
        payroll({ id: 'b', amount: 80, status: 'pending' }),
        payroll({ id: 'c', amount: 400, status: 'paid' }),
        payroll({ id: 'd', amount: 50, status: 'cancelled' }),
      ],
    });

    assert.equal(snapshot.pending, 200);
    assert.equal(snapshot.paid, 400);
  });

  it('counts assigned open jobs and claimable pool separately', () => {
    const snapshot = buildEarningsSnapshot({
      uid: 'mech',
      now: NOW,
      payroll: [],
      orders: [
        order({
          id: 'mine',
          number: '10',
          status: 'in_progress',
          laborLines: [{ id: 'l1', assigneeIds: ['mech'] }],
        }),
        order({
          id: 'pool',
          number: '11',
          status: 'confirmed',
          laborLines: [{ id: 'l2', assigneeIds: [] }],
        }),
        order({
          id: 'done',
          number: '12',
          status: 'completed',
          laborLines: [{ id: 'l3', assigneeIds: ['mech'] }],
        }),
      ],
    });

    assert.equal(snapshot.myOpen, 1);
    assert.equal(snapshot.freePool, 1);
    assert.equal(snapshot.myOpenJobs[0]?.number, '10');
    assert.equal(snapshot.claimableJobs[0]?.number, '11');
  });

  it('tallies completed jobs on the local day, even just after midnight', () => {
    const snapshot = buildEarningsSnapshot({
      uid: 'mech',
      now: NOW,
      payroll: [],
      orders: [
        order({
          id: 'closed',
          number: '20',
          status: 'completed',
          completedAt: NOW,
          laborLines: [{ id: 'l1', assigneeIds: ['mech'] }],
        }),
      ],
    });

    const today = snapshot.weekDays[snapshot.weekDays.length - 1];
    assert.equal(today?.isToday, true);
    assert.equal(today?.key, localDayKey(NOW));
    assert.equal(today?.count, 1);
    assert.equal(snapshot.weekClosedCount, 1);
  });

  it('does not tally a job closed before the seven-day window', () => {
    const snapshot = buildEarningsSnapshot({
      uid: 'mech',
      now: NOW,
      payroll: [],
      orders: [
        order({
          id: 'old',
          number: '21',
          status: 'delivered',
          completedAt: subDays(NOW, 20),
          laborLines: [{ id: 'l1', assigneeIds: ['mech'] }],
        }),
      ],
    });

    assert.equal(snapshot.weekClosedCount, 0);
  });

  it('surfaces pending payouts first and labels the work order', () => {
    const snapshot = buildEarningsSnapshot({
      uid: 'mech',
      now: NOW,
      orders: [order({ id: 'wo-paid', number: '44', status: 'completed' })],
      payroll: [
        payroll({
          id: 'paid',
          amount: 300,
          status: 'paid',
          workOrderId: 'wo-paid',
          createdAt: new Date('2026-08-12T10:00:00+05:00'),
        }),
        payroll({
          id: 'due',
          amount: 90,
          status: 'pending',
          workOrderId: 'missing',
          createdAt: new Date('2026-08-11T10:00:00+05:00'),
        }),
      ],
    });

    assert.equal(snapshot.payouts[0]?.id, 'due');
    assert.equal(snapshot.payouts[0]?.workOrderLabel, 'Work order');
    assert.equal(snapshot.payouts[1]?.workOrderLabel, 'Work order #44');
  });
});
