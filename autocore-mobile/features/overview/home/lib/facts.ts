/**
 * One pass over the catalogs, one definition of every derived quantity.
 *
 * Summary metrics and Attention items ask overlapping questions ("how many
 * parts are below their reorder level?"), and answering them separately is how
 * two sections of the same screen end up disagreeing. Both read this snapshot
 * instead, so a definition can only be changed in one place.
 *
 * Gating happens here too: a domain the reader cannot see, or whose listener has
 * not delivered yet, produces `null` — never an empty array standing in for
 * "nothing to report".
 */
import { isAssignedToWorkOrder, isClaimableWorkOrder } from '@autocore/rbac';
import { coerceToDate } from '@/lib/firestore-timestamp';
import { isMotorStale, isWarehouseLowStock } from '@/lib/inventory/is-low-stock';
import { isOpenStatus } from '@/lib/work-order/work-order-utils';
import type { FinancialOperation } from '@/types/financial-operation';
import type { InventoryItem } from '@/types/inventory';
import type { MotorEntity } from '@/types/motor';
import type { PayrollTransaction } from '@/types/payroll-transaction';
import type { WorkOrder } from '@/types/work-order';
import type { UserRole } from '@autocore/rbac';

import type {
  HomeIntakeJob,
  HomeMetricUnavailableReason,
  HomeModules,
  HomePeriod,
  HomePermissions,
  HomeSeriesPoint,
} from '../types';
import { buildHomeMoney, EMPTY_HOME_MONEY, type HomeMoneySnapshot } from './money';

export type HomeReadiness = {
  orders: boolean;
  operations: boolean;
  motors: boolean;
  inventory: boolean;
  payroll: boolean;
  intake: boolean;
};

export type HomeSourceInput = {
  now: Date;
  period: HomePeriod;
  previousPeriod: { start: Date; end: Date };
  role: UserRole | null;
  uid: string | null;
  permissions: HomePermissions;
  modules: HomeModules;
  ready: HomeReadiness;
  orders: WorkOrder[];
  operations: FinancialOperation[];
  motors: MotorEntity[];
  items: InventoryItem[];
  payroll: PayrollTransaction[];
  intakeJobs: HomeIntakeJob[];
  /** Pre-derived ledger snapshot; computed here when omitted. */
  money?: HomeMoneySnapshot;
};

export type HomeOrderFacts = {
  openCount: number;
  waitingPartsCount: number;
  assignedOpenCount: number;
  newInPeriod: number;
  newInPreviousPeriod: number;
  newPerBucket: HomeSeriesPoint[];
  lastUpdatedAt: Date | null;
};

export type HomeEngineFacts = {
  availableCount: number;
  agingCount: number;
  lastUpdatedAt: Date | null;
};

export type HomePartFacts = {
  availableCount: number;
  lowStockCount: number;
  lastUpdatedAt: Date | null;
};

export type HomeIntakeFacts = {
  inProgressCount: number;
  reworkCount: number;
  quarantineCount: number;
  awaitingVerificationCount: number;
};

export type HomeEarningsFacts = {
  claimableCount: number;
  pendingPayoutCount: number;
};

export type HomeFacts = {
  /** null = the reader cannot see this domain, or it has not loaded yet. */
  orders: HomeOrderFacts | null;
  ordersReason: HomeMetricUnavailableReason | null;
  engines: HomeEngineFacts | null;
  enginesReason: HomeMetricUnavailableReason | null;
  parts: HomePartFacts | null;
  partsReason: HomeMetricUnavailableReason | null;
  intake: HomeIntakeFacts | null;
  intakeReason: HomeMetricUnavailableReason | null;
  earnings: HomeEarningsFacts | null;
  earningsReason: HomeMetricUnavailableReason | null;
  money: HomeMoneySnapshot | null;
  moneyReason: HomeMetricUnavailableReason | null;
};

function gate(
  moduleOn: boolean,
  permitted: boolean,
  listenerReady: boolean,
): HomeMetricUnavailableReason | null {
  if (!moduleOn) return 'module_off';
  if (!permitted) return 'no_permission';
  if (!listenerReady) return 'not_ready';
  return null;
}

function newestDate(dates: Array<Date | null | undefined>): Date | null {
  let newest: Date | null = null;
  for (const date of dates) {
    if (!date) continue;
    if (!newest || date.getTime() > newest.getTime()) newest = date;
  }
  return newest;
}

function countCreatedInRange(orders: WorkOrder[], start: Date, end: Date): number {
  const from = start.getTime();
  const to = end.getTime();
  let total = 0;
  for (const order of orders) {
    const created = coerceToDate(order.createdAt);
    if (!created) continue;
    const ts = created.getTime();
    if (ts >= from && ts < to) total += 1;
  }
  return total;
}

export function buildHomeFacts(input: HomeSourceInput): HomeFacts {
  const { modules, permissions, ready, now, period } = input;

  /** Orders */
  const ordersReason = gate(modules.workOrders, permissions.canViewOrders, ready.orders);
  const orders: HomeOrderFacts | null = ordersReason
    ? null
    : (() => {
        const open = input.orders.filter((order) => isOpenStatus(order.status));
        return {
          openCount: open.length,
          waitingPartsCount: input.orders.filter((order) => order.status === 'waiting_parts')
            .length,
          assignedOpenCount: input.uid
            ? open.filter((order) => isAssignedToWorkOrder(order, input.uid as string)).length
            : 0,
          newInPeriod: countCreatedInRange(input.orders, period.start, period.end),
          newInPreviousPeriod: countCreatedInRange(
            input.orders,
            input.previousPeriod.start,
            input.previousPeriod.end,
          ),
          newPerBucket: period.buckets.map((bucket) => ({
            label: bucket.label,
            value: countCreatedInRange(input.orders, bucket.start, bucket.end),
          })),
          lastUpdatedAt: newestDate(input.orders.map((order) => coerceToDate(order.updatedAt))),
        };
      })();

  /** Engines */
  const enginesReason = gate(modules.motors, permissions.canViewMotors, ready.motors);
  const engines: HomeEngineFacts | null = enginesReason
    ? null
    : (() => {
        const available = input.motors.filter(
          (motor) => !motor.soldDate && (motor.status ?? 'available') === 'available',
        );
        return {
          availableCount: available.length,
          agingCount: available.filter((motor) => isMotorStale(motor, now)).length,
          lastUpdatedAt: newestDate(input.motors.map((motor) => coerceToDate(motor.updatedAt))),
        };
      })();

  /** Parts */
  const partsReason = gate(modules.warehouse, permissions.canViewInventory, ready.inventory);
  const parts: HomePartFacts | null = partsReason
    ? null
    : (() => {
        const active = input.items.filter((item) => item.status === 'active');
        return {
          // Stock a person can actually pick — not the number of catalog rows.
          availableCount: active.filter((item) => item.totalAvailable > 0).length,
          lowStockCount: active.filter(isWarehouseLowStock).length,
          lastUpdatedAt: newestDate(input.items.map((item) => coerceToDate(item.updatedAt))),
        };
      })();

  /** Intake */
  const intakeReason = gate(modules.motors, permissions.canViewIntake, ready.intake);
  const intake: HomeIntakeFacts | null = intakeReason
    ? null
    : {
        inProgressCount: input.intakeJobs.filter(
          (job) => job.state === 'open' || job.state === 'in_session' || job.state === 'paused',
        ).length,
        reworkCount: input.intakeJobs.filter((job) => job.state === 'rework').length,
        quarantineCount: input.intakeJobs.filter((job) => job.state === 'quarantine').length,
        awaitingVerificationCount: input.intakeJobs.filter(
          (job) => job.state === 'awaiting_verification',
        ).length,
      };

  /** Earnings — claimable comes off the same orders catalog, payouts off payroll. */
  const earningsReason = gate(
    true,
    permissions.canViewEarnings,
    ready.orders && (ready.payroll || !input.uid),
  );
  const earnings: HomeEarningsFacts | null = earningsReason
    ? null
    : {
        claimableCount: input.orders.filter((order) => isClaimableWorkOrder(order)).length,
        pendingPayoutCount: input.uid
          ? input.payroll.filter(
              (row) => row.employeeId === input.uid && row.status === 'pending',
            ).length
          : 0,
      };

  /** Money */
  const moneyReason = gate(modules.accounting, permissions.canViewMoney, ready.operations);
  const money: HomeMoneySnapshot | null = moneyReason
    ? null
    : (input.money ?? EMPTY_HOME_MONEY);

  return {
    orders,
    ordersReason,
    engines,
    enginesReason,
    parts,
    partsReason,
    intake,
    intakeReason,
    earnings,
    earningsReason,
    money,
    moneyReason,
  };
}

export { buildHomeMoney };
export type { HomeMoneySnapshot };
