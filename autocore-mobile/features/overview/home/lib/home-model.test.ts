import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { FinancialOperation } from '@/types/financial-operation';
import type { InventoryItem } from '@/types/inventory';
import type { MotorEntity } from '@/types/motor';
import type { PayrollTransaction } from '@/types/payroll-transaction';
import type { WorkOrder, WorkOrderStatus } from '@/types/work-order';
import type { ActionItem } from '@/lib/shell/types';
import type { UserRole } from '@autocore/rbac';

import type { HomeIntakeJob, HomeMetricId, HomePermissions, HomeModules } from '../types';
import { attentionInterrupts } from './attention';
import { buildHomeViewModel, type BuildHomeViewModelInput } from './build-home-view-model';
import { buildHomeFacts } from './facts';
import { buildHomeMetricCandidates } from './metrics';
import { buildHomeMoney } from './money';
import { resolveHomeWindows } from './period';

/** A Tuesday mid-morning — deliberately not the evening urgency branch. */
const NOW = new Date('2026-08-18T10:00:00.000Z');

/** The phone the fixture reader is holding. */
const DEVICE_ID = 'device_1';

/** A capture session this device already holds — what Continue is offered for. */
function heldIntakeJob(overrides: Partial<HomeIntakeJob> = {}): HomeIntakeJob {
  return {
    id: 'j1',
    state: 'in_session',
    activeSessionId: 's1',
    claimedByUid: 'u1',
    claimDeviceId: DEVICE_ID,
    label: 'U398539',
    ...overrides,
  };
}

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

const ALL_MODULES: HomeModules = {
  accounting: true,
  workOrders: true,
  warehouse: true,
  motors: true,
};

const ALL_READY = {
  orders: true,
  operations: true,
  motors: true,
  inventory: true,
  payroll: true,
  intake: true,
};

const ACTIONS: ActionItem[] = [
  { id: 'scan', title: 'Scan', subtitle: 'Barcode, VIN, or serial', href: '/(tabs)/scan', sf: '' },
  { id: 'new-order', title: 'New order', href: '/orders/new', sf: '' },
  { id: 'receive-engine', title: 'Receive engine', href: '/objects/new', sf: '' },
  { id: 'add-item', title: 'Add part', href: '/orders/create-item', sf: '' },
  { id: 'new-transaction', title: 'New transaction', href: '/finance/new', sf: '' },
  { id: 'search', title: 'Search', href: '/search', sf: '' },
];

function daysAgo(days: number, from: Date = NOW): Date {
  return new Date(from.getTime() - days * 86_400_000);
}

function order(overrides: Partial<WorkOrder> & { id: string }): WorkOrder {
  return {
    companyId: 'c1',
    number: overrides.id,
    status: 'in_progress' as WorkOrderStatus,
    clientId: 'client',
    vehicleId: 'vehicle',
    vin: '',
    licensePlate: '',
    mileage: 0,
    laborLines: [],
    partLines: [],
    motorLines: [],
    pricing: { laborTotal: 0, partsTotal: 0, motorsTotal: 0, discount: 0, grandTotal: 0 },
    createdByUserId: 'u1',
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
    ...overrides,
  } as WorkOrder;
}

function motor(overrides: Partial<MotorEntity> & { id: string }): MotorEntity {
  return {
    companyId: 'c1',
    serialCode: overrides.id,
    configuration: '',
    notes: '',
    quantity: 1,
    transmission: '',
    arrivalDate: daysAgo(10),
    status: 'available',
    updatedAt: daysAgo(2),
    ...overrides,
  } as MotorEntity;
}

function item(overrides: Partial<InventoryItem> & { id: string }): InventoryItem {
  return {
    companyId: 'c1',
    type: 'generic',
    sku: overrides.id,
    name: overrides.id,
    barcodes: [],
    unit: 'pc',
    totalOnHand: 10,
    totalReserved: 0,
    totalAvailable: 10,
    lowStockThreshold: 1,
    status: 'active',
    updatedAt: daysAgo(1),
    ...overrides,
  } as InventoryItem;
}

function operation(overrides: Partial<FinancialOperation> & { id: string }): FinancialOperation {
  return {
    companyId: 'c1',
    type: 'sale',
    amount: 1000,
    paymentMethod: 'cash',
    account: 'cashbox',
    createdAt: daysAgo(1),
    createdByUserId: 'u1',
    ...overrides,
  } as FinancialOperation;
}

function payout(overrides: Partial<PayrollTransaction> & { id: string }): PayrollTransaction {
  return {
    companyId: 'c1',
    employeeId: 'u1',
    workOrderId: 'wo',
    laborLineId: 'l1',
    role: 'mechanic',
    amount: 100,
    rateType: 'fixed',
    rate: 100,
    status: 'pending',
    createdAt: daysAgo(1),
    ...overrides,
  } as PayrollTransaction;
}

type SourceOverrides = Partial<
  Omit<BuildHomeViewModelInput, 'period' | 'previousPeriod' | 'now'>
> & { role?: UserRole | null };

function input(overrides: SourceOverrides = {}): BuildHomeViewModelInput {
  const windows = resolveHomeWindows('7d', NOW);
  const operations = overrides.operations ?? [];
  const permissions = overrides.permissions ?? FULL_PERMISSIONS;
  const modules = overrides.modules ?? ALL_MODULES;
  const ready = overrides.ready ?? ALL_READY;

  return {
    now: NOW,
    period: windows.period,
    previousPeriod: { start: windows.previous.from, end: windows.previous.to },
    role: 'owner',
    uid: 'u1',
    permissions,
    modules,
    ready,
    orders: [],
    operations,
    motors: [],
    items: [],
    payroll: [],
    intakeJobs: [] as HomeIntakeJob[],
    deviceId: DEVICE_ID,
    stuckIntakePhotos: 0,
    money:
      permissions.canViewMoney && modules.accounting && ready.operations
        ? buildHomeMoney(operations, windows.current, windows.previous)
        : undefined,
    companyId: 'c1',
    organizationName: 'Northgate Motors',
    offline: false,
    actions: ACTIONS,
    ...overrides,
  };
}

function ids(metrics: Array<{ id: HomeMetricId }>): HomeMetricId[] {
  return metrics.map((metric) => metric.id);
}

describe('home facts', () => {
  it('reports null for a domain the reader cannot see, not an empty count', () => {
    const facts = buildHomeFacts(
      input({ permissions: { ...FULL_PERMISSIONS, canViewMoney: false } }),
    );

    assert.equal(facts.money, null);
    assert.equal(facts.moneyReason, 'no_permission');
  });

  it('distinguishes a module that is off from a listener that has not landed', () => {
    const off = buildHomeFacts(input({ modules: { ...ALL_MODULES, motors: false } }));
    const loading = buildHomeFacts(input({ ready: { ...ALL_READY, motors: false } }));

    assert.equal(off.enginesReason, 'module_off');
    assert.equal(loading.enginesReason, 'not_ready');
  });

  it('counts parts a person can actually pick, not catalog rows', () => {
    const facts = buildHomeFacts(
      input({
        items: [
          item({ id: 'p1', totalAvailable: 4 }),
          item({ id: 'p2', totalAvailable: 0, totalOnHand: 0 }),
          item({ id: 'p3', status: 'archived' }),
        ],
      }),
    );

    assert.equal(facts.parts?.availableCount, 1);
  });

  it('reads low stock from the shared warehouse rule', () => {
    const facts = buildHomeFacts(
      input({
        items: [
          item({ id: 'p1', totalAvailable: 1, lowStockThreshold: 2 }),
          item({ id: 'p2', totalAvailable: 40, lowStockThreshold: 2 }),
        ],
      }),
    );

    assert.equal(facts.parts?.lowStockCount, 1);
  });

  it('counts only unsold, available engines as stock', () => {
    const facts = buildHomeFacts(
      input({
        motors: [
          motor({ id: 'm1' }),
          motor({ id: 'm2', status: 'sold', soldDate: daysAgo(3) }),
          motor({ id: 'm3', status: 'reserved' }),
          motor({ id: 'm4', arrivalDate: daysAgo(120) }),
        ],
      }),
    );

    assert.equal(facts.engines?.availableCount, 2);
    assert.equal(facts.engines?.agingCount, 1);
  });
});

describe('home metric candidates', () => {
  it('leaves a count unknown rather than zero while its listener is in flight', () => {
    const candidates = buildHomeMetricCandidates(input({ ready: { ...ALL_READY, orders: false } }));
    const openOrders = candidates.find((metric) => metric.id === 'orders.open');

    assert.equal(openOrders?.value, null);
    assert.equal(openOrders?.unavailableReason, 'not_ready');
  });

  it('reports a genuine zero once the listener has landed', () => {
    const candidates = buildHomeMetricCandidates(input({ orders: [] }));
    const openOrders = candidates.find((metric) => metric.id === 'orders.open');

    assert.equal(openOrders?.value, 0);
    assert.equal(openOrders?.unavailableReason, null);
  });

  it('withholds queue metrics at zero instead of announcing nothing is wrong', () => {
    const candidates = buildHomeMetricCandidates(input({ items: [item({ id: 'p1' })] }));
    const lowStock = candidates.find((metric) => metric.id === 'parts.low_stock');

    assert.equal(lowStock?.value, 0);
    assert.equal(lowStock?.unavailableReason, 'insufficient_data');
  });

  it('refuses a percentage when the previous window had no baseline', () => {
    const candidates = buildHomeMetricCandidates(
      input({ orders: [order({ id: 'w1', createdAt: daysAgo(1) })] }),
    );
    const newOrders = candidates.find((metric) => metric.id === 'orders.new');

    assert.equal(newOrders?.value, 1);
    assert.equal(newOrders?.comparison?.deltaPercent, null);
    assert.equal(newOrders?.comparison?.delta, 1);
  });

  it('compares against the previous window when there is one', () => {
    const candidates = buildHomeMetricCandidates(
      input({
        orders: [
          order({ id: 'a', createdAt: daysAgo(1) }),
          order({ id: 'b', createdAt: daysAgo(2) }),
          order({ id: 'c', createdAt: daysAgo(3) }),
          order({ id: 'd', createdAt: daysAgo(9) }),
          order({ id: 'e', createdAt: daysAgo(10) }),
        ],
      }),
    );
    const newOrders = candidates.find((metric) => metric.id === 'orders.new');

    assert.equal(newOrders?.value, 3);
    assert.equal(newOrders?.comparison?.previousValue, 2);
    assert.equal(newOrders?.comparison?.deltaPercent, 50);
  });

  it('gives an accountant a higher money prior than a mechanic', () => {
    const accountant = buildHomeMetricCandidates(input({ role: 'accountant' }));
    const mechanic = buildHomeMetricCandidates(input({ role: 'mechanic' }));

    const cashFor = (list: ReturnType<typeof buildHomeMetricCandidates>) =>
      list.find((metric) => metric.id === 'cash.balance')?.scores.businessImportance ?? 0;

    assert.ok(cashFor(accountant) > cashFor(mechanic));
  });

  it('treats a negative cash position as maximally urgent', () => {
    const candidates = buildHomeMetricCandidates(
      input({ operations: [operation({ id: 'o1', type: 'expense', amount: 500 })] }),
    );
    const cash = candidates.find((metric) => metric.id === 'cash.balance');

    assert.ok((cash?.value ?? 0) < 0);
    assert.equal(cash?.scores.urgency, 1);
  });
});

describe('home attention', () => {
  it('is empty when nothing needs a person', () => {
    const model = buildHomeViewModel(input());
    assert.deepEqual(model.attention, []);
  });

  it('puts a blocking item ahead of every warning', () => {
    const model = buildHomeViewModel(
      input({
        orders: [order({ id: 'w1', status: 'waiting_parts' })],
        items: [item({ id: 'p1', totalAvailable: 0, totalOnHand: 0, lowStockThreshold: 2 })],
        intakeJobs: [{ id: 'j1', state: 'quarantine' }],
      }),
    );

    assert.equal(model.attention[0].id, 'intake.quarantine');
    assert.equal(model.attention[0].severity, 'blocking');
  });

  it('keeps informational items last', () => {
    const model = buildHomeViewModel(
      input({
        orders: [order({ id: 'w1', status: 'waiting_parts' })],
        intakeJobs: [{ id: 'j1', state: 'awaiting_verification' }],
      }),
    );

    assert.deepEqual(
      model.attention.map((entry) => entry.severity),
      ['warning', 'informational'],
    );
  });

  it('stays silent about domains the reader cannot see', () => {
    const model = buildHomeViewModel(
      input({
        permissions: { ...FULL_PERMISSIONS, canViewInventory: false },
        items: [item({ id: 'p1', totalAvailable: 0, totalOnHand: 0, lowStockThreshold: 2 })],
      }),
    );

    assert.deepEqual(model.attention, []);
  });

  it('surfaces own pending payouts only for the signed-in employee', () => {
    const model = buildHomeViewModel(
      input({
        uid: 'u1',
        payroll: [payout({ id: 'p1' }), payout({ id: 'p2', employeeId: 'someone-else' })],
      }),
    );
    const pending = model.attention.find((entry) => entry.id === 'payroll.pending');

    assert.equal(pending?.count, 1);
  });
});

describe('home view model', () => {
  it('does not hand slot one to money by default', () => {
    const model = buildHomeViewModel(
      input({
        operations: [operation({ id: 'o1', amount: 25_000 })],
        items: [
          item({ id: 'p1', totalAvailable: 0, totalOnHand: 0, lowStockThreshold: 2 }),
          item({ id: 'p2', totalAvailable: 0, totalOnHand: 0, lowStockThreshold: 2 }),
          item({ id: 'p3', totalAvailable: 0, totalOnHand: 0, lowStockThreshold: 2 }),
        ],
      }),
    );

    assert.equal(model.summary[0].id, 'parts.low_stock');
  });

  it('lets money lead when it is what actually needs a person', () => {
    const model = buildHomeViewModel(
      input({ operations: [operation({ id: 'o1', type: 'expense', amount: 4_000 })] }),
    );

    assert.equal(model.summary[0].id, 'cash.balance');
  });

  it('produces the same brief twice for the same snapshot', () => {
    const first = buildHomeViewModel(input({ orders: [order({ id: 'w1' })] }));
    const second = buildHomeViewModel(input({ orders: [order({ id: 'w1' })] }));

    assert.deepEqual(ids(first.summary), ids(second.summary));
    assert.deepEqual(
      first.attention.map((entry) => entry.id),
      second.attention.map((entry) => entry.id),
    );
  });

  it('keeps Summary to a brief', () => {
    const model = buildHomeViewModel(
      input({
        orders: [order({ id: 'w1' })],
        motors: [motor({ id: 'm1' })],
        items: [item({ id: 'p1' })],
        operations: [operation({ id: 'o1' })],
      }),
    );

    assert.ok(model.summary.length <= 4);
  });

  it('shows a mechanic their own work rather than the company ledger', () => {
    const assigned = order({
      id: 'w1',
      laborLines: [
        { id: 'l1', title: 'Job', hours: 1, unitPrice: 10, assigneeIds: ['u1'], assigneeRole: 'mechanic' },
      ],
    });

    const model = buildHomeViewModel(
      input({
        role: 'mechanic',
        permissions: { ...FULL_PERMISSIONS, canViewMoney: false },
        orders: [assigned],
      }),
    );

    assert.equal(model.summary[0].id, 'work.assigned_open');
    assert.ok(!ids(model.summary).some((id) => id.startsWith('money.') || id === 'cash.balance'));
  });

  it('keeps a stable stock metric on a quiet day instead of a grid of zeros', () => {
    const model = buildHomeViewModel(
      input({ motors: [motor({ id: 'm1' })], items: [item({ id: 'p1' })] }),
    );

    assert.ok(model.summary.length > 0);
    assert.deepEqual(model.trends, []);
  });

  it('offers only commands as quick actions — never a browse destination', () => {
    const model = buildHomeViewModel(
      input({ intakeJobs: [heldIntakeJob()], stuckIntakePhotos: 2 }),
    );

    assert.ok(model.quickActions.length > 0);
    assert.ok(!model.quickActions.some((action) => action.id === 'search'));
    for (const action of model.quickActions) {
      assert.ok(
        ['resume-intake', 'retry-intake-photos', 'capture', 'compose'].includes(
          action.command.kind,
        ),
        `${action.id} runs ${action.command.kind}`,
      );
    }
  });

  it('resumes the engine this phone is holding instead of opening a filtered list', () => {
    const idle = buildHomeViewModel(input());
    const busy = buildHomeViewModel(input({ intakeJobs: [heldIntakeJob()] }));

    assert.ok(!idle.quickActions.some((action) => action.id === 'intake.resume'));

    const resume = busy.quickActions.find((action) => action.id === 'intake.resume');
    assert.ok(resume);
    assert.equal(resume.detail, 'U398539');
    assert.deepEqual(resume.command, {
      kind: 'resume-intake',
      jobId: 'j1',
      sessionId: 's1',
    });
    // Work already begun leads work not yet begun.
    assert.equal(busy.quickActions[0].id, 'intake.resume');
    assert.ok(busy.quickActions.length <= 4);
  });

  it('will not offer Continue for a session another phone or person holds', () => {
    const otherDevice = buildHomeViewModel(
      input({ intakeJobs: [heldIntakeJob({ claimDeviceId: 'device_2' })] }),
    );
    const otherWorker = buildHomeViewModel(
      input({ intakeJobs: [heldIntakeJob({ claimedByUid: 'u2' })] }),
    );
    const unclaimed = buildHomeViewModel(
      input({ intakeJobs: [heldIntakeJob({ state: 'open', activeSessionId: null })] }),
    );

    for (const model of [otherDevice, otherWorker, unclaimed]) {
      assert.ok(!model.quickActions.some((action) => action.id === 'intake.resume'));
    }
  });

  it('leads with the photos stuck on this phone, and drops the action once they clear', () => {
    const stuck = buildHomeViewModel(
      input({ intakeJobs: [heldIntakeJob()], stuckIntakePhotos: 3 }),
    );
    const clear = buildHomeViewModel(input({ intakeJobs: [heldIntakeJob()] }));

    assert.equal(stuck.quickActions[0].id, 'intake.retry-photos');
    assert.equal(stuck.quickActions[0].detail, '3');
    assert.equal(stuck.quickActions[0].tone, 'blocked');
    assert.ok(!clear.quickActions.some((action) => action.id === 'intake.retry-photos'));
  });

  it('withholds intake commands from a reader the shell gives no intake action', () => {
    const model = buildHomeViewModel(
      input({
        actions: ACTIONS.filter((action) => action.id !== 'receive-engine'),
        intakeJobs: [heldIntakeJob()],
        stuckIntakePhotos: 2,
      }),
    );

    assert.ok(!model.quickActions.some((action) => action.id.startsWith('intake.')));
  });

  it('orders activity newest first and routes each row at its own order', () => {
    const model = buildHomeViewModel(
      input({
        orders: [
          order({ id: 'old', number: '1', updatedAt: daysAgo(3) }),
          order({ id: 'new', number: '2', updatedAt: daysAgo(1) }),
        ],
      }),
    );

    assert.deepEqual(
      model.activity.map((row) => row.id),
      ['new', 'old'],
    );
    assert.equal(model.activity[0].destination.pathname, '/orders/new');
  });

  it('marks data stale when offline without a second Home offline chip', () => {
    const model = buildHomeViewModel(input({ offline: true }));

    assert.equal(model.meta.dataQualityOverall, 'stale');
    // Connectivity chrome lives on OfflineSessionBanner, not Home header.
    assert.equal(model.context.offlineBanner, null);
  });

  it('reports partial quality while a permitted listener is still landing', () => {
    const model = buildHomeViewModel(input({ ready: { ...ALL_READY, inventory: false } }));

    assert.equal(model.meta.ready, false);
    assert.equal(model.meta.dataQualityOverall, 'partial');
  });

  it('is ready when the only missing domains are ones this role cannot see', () => {
    const model = buildHomeViewModel(
      input({
        permissions: { ...FULL_PERMISSIONS, canViewMoney: false },
        ready: { ...ALL_READY, operations: false },
      }),
    );

    assert.equal(model.meta.ready, true);
  });

  it('shows no location context until multi-site is a product', () => {
    assert.equal(buildHomeViewModel(input()).context.locationLabel, null);
  });

  it('orients with a date instead of a header full of controls', () => {
    const model = buildHomeViewModel(input());

    assert.match(model.context.dateLabel, /^\w+day, \d{1,2} \w+$/);
    assert.equal(model.context.organizationName, 'Northgate Motors');
  });
});

describe('no duplicated information', () => {
  const lowStock = [
    item({ id: 'p1', totalAvailable: 0, totalOnHand: 0, lowStockThreshold: 2 }),
    item({ id: 'p2', totalAvailable: 0, totalOnHand: 0, lowStockThreshold: 2 }),
    item({ id: 'p3', totalAvailable: 0, totalOnHand: 0, lowStockThreshold: 2 }),
  ];

  it('drops the attention row that would restate the leading metric', () => {
    const model = buildHomeViewModel(input({ items: lowStock }));

    assert.equal(model.summary[0].id, 'parts.low_stock');
    assert.ok(!model.attention.some((entry) => entry.id === 'parts.low_stock'));
  });

  it('moves the dropped sentence up to the leading metric', () => {
    const model = buildHomeViewModel(input({ items: lowStock }));

    assert.equal(model.summary[0].note, 'Restock before a job stalls waiting on the shelf.');
  });

  it('keeps the attention row when a different metric leads', () => {
    const model = buildHomeViewModel(
      input({
        items: lowStock,
        operations: [operation({ id: 'o1', type: 'expense', amount: 9_000 })],
      }),
    );

    assert.equal(model.summary[0].id, 'cash.balance');
    assert.ok(model.attention.some((entry) => entry.id === 'parts.low_stock'));
  });

  it('explains the leading metric from its own comparison when nothing was dropped', () => {
    const model = buildHomeViewModel(
      input({
        operations: [
          operation({ id: 'now', amount: 10_000, createdAt: daysAgo(1) }),
          operation({ id: 'before', amount: 5_000, createdAt: daysAgo(9) }),
        ],
      }),
    );
    const featured = model.summary[0];

    assert.ok(featured.note?.includes('%'));
    assert.ok(featured.note?.includes('previous'));
  });

  it('only lets a blocked condition break in above the Summary', () => {
    const warning = buildHomeViewModel(input({ items: lowStock }));
    const blocked = buildHomeViewModel(
      input({ items: lowStock, intakeJobs: [{ id: 'j1', state: 'quarantine' }] }),
    );

    assert.equal(attentionInterrupts(warning.attention), false);
    assert.equal(attentionInterrupts(blocked.attention), true);
  });
});

describe('a quiet business', () => {
  it('says the week was quiet instead of printing a headline zero', () => {
    const model = buildHomeViewModel(input({ motors: [motor({ id: 'm1' })] }));

    assert.equal(model.summaryNote, 'No sales recorded in the last 7 days.');
    assert.ok(!ids(model.summary).includes('money.revenue'));
  });

  it('still surfaces the operational numbers that are true', () => {
    const model = buildHomeViewModel(
      input({ motors: [motor({ id: 'm1' })], items: [item({ id: 'p1' })], orders: [order({ id: 'w1' })] }),
    );

    assert.ok(ids(model.summary).includes('engines.available'));
    assert.ok(ids(model.summary).includes('orders.open'));
  });

  it('keeps a zero that is a real drop, because that is news', () => {
    const model = buildHomeViewModel(
      input({ operations: [operation({ id: 'before', amount: 8_000, createdAt: daysAgo(9) })] }),
    );
    const revenue = model.summary.find((metric) => metric.id === 'money.revenue');

    assert.equal(revenue?.value, 0);
    assert.equal(revenue?.comparison?.deltaPercent, -100);
  });

  it('hides Trends outright when nothing can be compared', () => {
    const model = buildHomeViewModel(input());
    assert.equal(model.trendsAvailable, false);
  });

  it('never leads with a zero while another metric has a value', () => {
    // Nothing open, one engine on the shelf — "0" is true but it is not the
    // headline, and a zero set in display type reads as a broken screen.
    const model = buildHomeViewModel(
      input({ orders: [], motors: [motor({ id: 'm1' })], items: [item({ id: 'p1' })] }),
    );

    assert.notEqual(model.summary[0].value, 0);
    assert.ok(model.summary.some((metric) => metric.value === 0));
  });

  it('keeps the rest of the ranking intact when it promotes', () => {
    const model = buildHomeViewModel(
      input({ orders: [], motors: [motor({ id: 'm1' })], items: [item({ id: 'p1' })] }),
    );
    const promoted = model.summary[0].id;
    const rest = ids(model.summary).slice(1);

    assert.ok(!rest.includes(promoted));
    assert.equal(new Set(ids(model.summary)).size, model.summary.length);
  });

  it('accepts a zero lead when every metric is zero', () => {
    const model = buildHomeViewModel(input({ orders: [] }));

    if (model.summary.length > 0) {
      assert.ok(model.summary.every((metric) => metric.value === 0));
    }
  });
});

describe('trend window', () => {
  const spread = [
    operation({ id: 'a', amount: 4_000, createdAt: daysAgo(2) }),
    operation({ id: 'b', amount: 1_000, createdAt: daysAgo(9) }),
    operation({ id: 'c', amount: 900, createdAt: daysAgo(20) }),
    operation({ id: 'd', amount: 800, createdAt: daysAgo(45) }),
  ];

  function withTrendWindow(id: '7d' | '30d' | '3m') {
    const base = input({ operations: spread });
    const windows = resolveHomeWindows(id, NOW);
    return buildHomeViewModel({
      ...base,
      trendWindow: {
        period: windows.period,
        previousPeriod: { start: windows.previous.from, end: windows.previous.to },
        money: buildHomeMoney(spread, windows.current, windows.previous),
      },
    });
  }

  it('reports the range the reader chose', () => {
    assert.equal(withTrendWindow('30d').meta.trendPeriod.id, '30d');
    assert.equal(withTrendWindow('3m').meta.trendPeriod.id, '3m');
  });

  it('leaves the Summary window fixed however wide Trends is opened', () => {
    const wide = withTrendWindow('3m');

    assert.equal(wide.meta.summaryPeriod.id, '7d');
    assert.ok(
      wide.summary
        .filter((metric) => metric.periodLabel !== 'Now')
        .every((metric) => metric.periodLabel === 'Last 7 days'),
    );
  });

  it('measures trends over the chosen range, not the Summary week', () => {
    const week = withTrendWindow('7d');
    const quarter = withTrendWindow('3m');

    // Same data, different windows — the comparison the trend is built on has to
    // differ, otherwise the control is decorative.
    assert.notDeepEqual(
      week.trends.map((trend) => trend.deltaPercent),
      quarter.trends.map((trend) => trend.deltaPercent),
    );
  });
});

describe('recent activity', () => {
  it('times a closed order by when it closed, not when the record last changed', () => {
    const model = buildHomeViewModel(
      input({
        orders: [
          order({
            id: 'done',
            number: '7',
            status: 'delivered',
            completedAt: daysAgo(1),
            updatedAt: daysAgo(6),
          }),
          order({ id: 'live', number: '8', updatedAt: daysAgo(3) }),
        ],
      }),
    );

    assert.deepEqual(
      model.activity.map((row) => row.id),
      ['done', 'live'],
    );
  });

  it('omits an order with no timestamp rather than inventing one', () => {
    const model = buildHomeViewModel(
      input({ orders: [order({ id: 'ghost', updatedAt: undefined, completedAt: undefined })] }),
    );

    assert.deepEqual(model.activity, []);
  });
});
