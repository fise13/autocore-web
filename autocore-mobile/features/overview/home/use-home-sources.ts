/**
 * Home's read layer.
 *
 * Every catalog here is already subscribed for the session by
 * `SessionRealtimeHead`, so this hook joins those listeners through the realtime
 * registry rather than opening a second set. What it adds is the distinction the
 * whole screen depends on: *loaded and empty* versus *not loaded yet*.
 *
 * Readiness is subscribed explicitly through the registry instead of being
 * inferred from data identity. A listener that delivers an empty collection does
 * not necessarily change the query cache, and inferring readiness from the data
 * alone is how a screen ends up insisting there are zero open orders while the
 * first snapshot is still in flight.
 */
import { useMemo, useState, useSyncExternalStore } from 'react';

import { useEngineIntakeJobs } from '@/features/engine-intake/hooks/use-engine-intake-data';
import { getEngineIntakeDeviceId } from '@/features/engine-intake/lib/device';
import { useEngineIntakeOutbox } from '@/features/engine-intake/store/intake-outbox';
import { useCompanyModuleEnabled } from '@/hooks/use-module-enabled';
import { useRbacPolicy } from '@/hooks/use-rbac-policy';
import { useSession } from '@/hooks/use-session';
import { useSessionQueryData } from '@/hooks/use-session-query-data';
import { useWorkOrdersRealtime } from '@/hooks/use-work-orders-realtime';
import {
  isRealtimeReady,
  subscribeRealtimeRegistry,
} from '@/lib/realtime/subscription-registry';
import { normalizeInventoryItem } from '@/services/firestore/inventory-item-repository';
import { useAuthStore } from '@/store/auth-store';
import type { FinancialOperation } from '@/types/financial-operation';
import type { InventoryItem } from '@/types/inventory';
import type { MotorEntity } from '@/types/motor';
import type { PayrollTransaction } from '@/types/payroll-transaction';
import type { WorkOrder } from '@/types/work-order';

import type { HomeIntakeJob, HomeModules, HomePermissions } from './types';
import type { HomeReadiness } from './lib/facts';

export type HomeSources = {
  companyId: string | null;
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
  /** This phone's intake identity — what makes a claimed session ours to resume. */
  deviceId: string | null;
  /** Intake photos this phone has failed to upload. */
  stuckIntakePhotos: number;
  offline: boolean;
};

const EMPTY_ORDERS: WorkOrder[] = [];
const EMPTY_OPERATIONS: FinancialOperation[] = [];
const EMPTY_MOTORS: MotorEntity[] = [];
const EMPTY_ITEMS: InventoryItem[] = [];
const EMPTY_PAYROLL: PayrollTransaction[] = [];
const EMPTY_INTAKE: HomeIntakeJob[] = [];

export function useHomeSources(): HomeSources {
  const { companyId, uid } = useSession();
  /** Stable for the life of the install — read once rather than on every render. */
  const [deviceId] = useState(getEngineIntakeDeviceId);
  const rbac = useRbacPolicy();
  const offline = !useAuthStore((state) => state.isOnline);

  const accountingModule = useCompanyModuleEnabled('accounting');
  const workOrdersModule = useCompanyModuleEnabled('workOrders');
  const warehouseModule = useCompanyModuleEnabled('warehouse');
  const motorsModule = useCompanyModuleEnabled('motors');

  const permissions = useMemo<HomePermissions>(
    () => ({
      // Revenue is visible to the ledger reader and to the analyst — the two
      // permissions the rest of the app already treats as equivalent here.
      canViewMoney:
        rbac.scopes.accounting !== 'none' &&
        (rbac.can('accounting_view') || rbac.can('analytics_view')),
      canViewOrders: rbac.scopes.workOrders !== 'none',
      canViewInventory: rbac.scopes.inventory !== 'none',
      canViewMotors: rbac.scopes.motors !== 'none',
      canViewIntake: rbac.can('engine_intake_view'),
      canViewEarnings: rbac.nav.canAccessMyEarnings,
      // No Home preference store exists yet — Customize stays off rather than
      // shipping a control that cannot persist anything.
      canCustomize: false,
      ordersScope: rbac.scopes.workOrders,
    }),
    [rbac],
  );

  const modules = useMemo<HomeModules>(
    () => ({
      accounting: accountingModule,
      workOrders: workOrdersModule,
      warehouse: warehouseModule,
      motors: motorsModule,
    }),
    [accountingModule, motorsModule, warehouseModule, workOrdersModule],
  );

  const hasCompany = Boolean(companyId);
  const ordersEnabled = hasCompany && permissions.canViewOrders && modules.workOrders;
  const operationsEnabled = hasCompany && permissions.canViewMoney && modules.accounting;
  const motorsEnabled =
    hasCompany && permissions.canViewMotors && modules.motors && Boolean(uid?.trim());
  const inventoryEnabled = hasCompany && permissions.canViewInventory && modules.warehouse;
  const payrollEnabled = hasCompany && permissions.canViewEarnings;
  const intakeEnabled = hasCompany && permissions.canViewIntake && modules.motors;

  const ordersKey = useMemo(
    () => ['realtime', 'work-orders', companyId, rbac.scopes.workOrders, uid] as const,
    [companyId, rbac.scopes.workOrders, uid],
  );
  const operationsKey = useMemo(
    () => ['realtime', 'financial-operations', companyId] as const,
    [companyId],
  );
  const motorsKey = useMemo(
    () => ['realtime', 'motors', companyId, uid] as const,
    [companyId, uid],
  );
  const inventoryKey = useMemo(
    () => ['realtime', 'inventory-items', companyId] as const,
    [companyId],
  );
  const payrollKey = useMemo(
    () => ['realtime', 'payroll-transactions', companyId, rbac.scopes.payroll, uid] as const,
    [companyId, rbac.scopes.payroll, uid],
  );

  const { domainOrders } = useWorkOrdersRealtime(ordersEnabled ? companyId : null, {
    scope: rbac.scopes.workOrders,
    uid,
  });

  const operations = useSessionQueryData<FinancialOperation[]>(
    operationsKey,
    operationsEnabled,
    EMPTY_OPERATIONS,
  );
  const motors = useSessionQueryData<MotorEntity[]>(motorsKey, motorsEnabled, EMPTY_MOTORS);
  const rawInventory = useSessionQueryData<InventoryItem[]>(
    inventoryKey,
    inventoryEnabled,
    EMPTY_ITEMS,
  );
  const payroll = useSessionQueryData<PayrollTransaction[]>(
    payrollKey,
    payrollEnabled,
    EMPTY_PAYROLL,
  );

  const intake = useEngineIntakeJobs(intakeEnabled ? (companyId ?? null) : null);
  /**
   * A local store, not a listener — reading it costs nothing and it is the only
   * place that knows which photos this phone is still holding.
   */
  const outbox = useEngineIntakeOutbox(intakeEnabled ? (companyId ?? null) : null);

  /**
   * One string per render, compared by value — a stable snapshot for
   * `useSyncExternalStore`, and a re-render exactly when a listener flips ready.
   */
  const readySignature = useSyncExternalStore(
    subscribeRealtimeRegistry,
    () =>
      [
        !ordersEnabled || isRealtimeReady(ordersKey) ? '1' : '0',
        !operationsEnabled || isRealtimeReady(operationsKey) ? '1' : '0',
        !motorsEnabled || isRealtimeReady(motorsKey) ? '1' : '0',
        !inventoryEnabled || isRealtimeReady(inventoryKey) ? '1' : '0',
        !payrollEnabled || isRealtimeReady(payrollKey) ? '1' : '0',
      ].join(''),
  );

  const ready = useMemo<HomeReadiness>(
    () => ({
      orders: readySignature[0] === '1',
      operations: readySignature[1] === '1',
      motors: readySignature[2] === '1',
      inventory: readySignature[3] === '1',
      payroll: readySignature[4] === '1',
      // Intake keeps its own cache-backed loading flag rather than the registry.
      intake: !intakeEnabled || !intake.loading,
    }),
    [intake.loading, intakeEnabled, readySignature],
  );

  const items = useMemo(
    () => (inventoryEnabled ? rawInventory.map(normalizeInventoryItem) : EMPTY_ITEMS),
    [inventoryEnabled, rawInventory],
  );

  /**
   * The claim fields ride along because Home offers Continue, and Continue is
   * only honest when this device already holds the session. `useEngineIntakeJobs`
   * merges the optimistic overlay, so an engine created seconds ago on this
   * phone is resumable before the server has acknowledged anything.
   */
  const intakeJobs = useMemo<HomeIntakeJob[]>(
    () =>
      intakeEnabled
        ? intake.jobs.map((job) => ({
            id: job.id,
            state: job.state as string,
            activeSessionId: job.assignment.activeSessionId ?? null,
            claimedByUid: job.assignment.claimedByUid ?? null,
            claimDeviceId: job.assignment.claimDeviceId ?? null,
            label:
              job.expectedIdentity.serialCode?.trim() ||
              job.expectedIdentity.engineCode?.trim() ||
              '',
          }))
        : EMPTY_INTAKE,
    [intake.jobs, intakeEnabled],
  );

  return {
    companyId: companyId || null,
    uid: uid ?? null,
    permissions,
    modules,
    ready,
    orders: ordersEnabled ? domainOrders : EMPTY_ORDERS,
    operations: operationsEnabled ? operations : EMPTY_OPERATIONS,
    motors: motorsEnabled ? motors : EMPTY_MOTORS,
    items,
    payroll: payrollEnabled ? payroll : EMPTY_PAYROLL,
    intakeJobs,
    deviceId: intakeEnabled ? deviceId : null,
    stuckIntakePhotos: intakeEnabled ? outbox.photoFailedCount : 0,
    offline,
  };
}
