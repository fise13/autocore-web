import type { PayrollTransaction } from '@/types/payroll-transaction';
import type { WorkOrder } from '@/types/work-order';

import type {
  FinanceEngineModel,
  FinanceEngineProfitability,
  FinanceProfitability,
  FinanceWorkOrderProfit,
} from '../types';
import { engineModelFromOperation, isEngineSale, isIncome } from './classify';
import type { DatedOperation } from './series';

/**
 * Profitability only claims a margin where the ledger actually records a cost.
 *
 * Engine sales carry no cost basis today, so engine rows report revenue, units
 * and mix, and the margin column stays absent rather than invented. Work orders
 * *do* record both sides — parts cost is written as its own operation and labor
 * lands as payroll rows — so those rows carry a real margin.
 */

type ModelAccumulator = {
  label: string;
  units: number;
  revenue: number;
  previousRevenue: number;
  costBasis: number;
  withCostBasis: number;
  attributed: boolean;
};

function accumulateEngines(
  dated: DatedOperation[],
  into: Map<string, ModelAccumulator>,
  field: 'revenue' | 'previousRevenue',
): void {
  for (const { operation } of dated) {
    if (!isEngineSale(operation)) continue;
    const model = engineModelFromOperation(operation);
    const entry =
      into.get(model.key) ??
      ({
        label: model.label,
        units: 0,
        revenue: 0,
        previousRevenue: 0,
        costBasis: 0,
        withCostBasis: 0,
        attributed: model.attributed,
      } satisfies ModelAccumulator);

    entry[field] += operation.amount;
    if (field === 'revenue') {
      entry.units += 1;
      if (operation.costBasis != null && Number.isFinite(operation.costBasis)) {
        entry.costBasis += operation.costBasis;
        entry.withCostBasis += 1;
      }
    }
    into.set(model.key, entry);
  }
}

export function buildEngineProfitability(
  current: DatedOperation[],
  previous: DatedOperation[],
): FinanceEngineProfitability {
  const accumulators = new Map<string, ModelAccumulator>();
  accumulateEngines(current, accumulators, 'revenue');
  accumulateEngines(previous, accumulators, 'previousRevenue');

  let revenue = 0;
  let units = 0;
  let withCostBasis = 0;
  for (const entry of accumulators.values()) {
    revenue += entry.revenue;
    units += entry.units;
    withCostBasis += entry.withCostBasis;
  }

  const models: FinanceEngineModel[] = [...accumulators.entries()]
    .filter(([, entry]) => entry.units > 0 || entry.previousRevenue > 0)
    .map(([key, entry]) => {
      // A margin is only stated when every unit in the group priced its cost.
      const complete = entry.units > 0 && entry.withCostBasis === entry.units;
      const profit = complete ? entry.revenue - entry.costBasis : null;
      return {
        id: key,
        label: entry.label,
        units: entry.units,
        revenue: entry.revenue,
        averagePrice: entry.units > 0 ? entry.revenue / entry.units : 0,
        share: revenue > 0 ? entry.revenue / revenue : 0,
        previousRevenue: entry.previousRevenue,
        profit,
        margin: profit != null && entry.revenue > 0 ? profit / entry.revenue : null,
        unattributed: !entry.attributed,
      };
    })
    .sort((left, right) => right.revenue - left.revenue);

  return {
    models,
    revenue,
    units,
    withCostBasis,
    costUnavailable: units > 0 && withCostBasis === 0,
  };
}

export function buildWorkOrderProfitability(
  current: DatedOperation[],
  orders: WorkOrder[],
  payroll: PayrollTransaction[],
): FinanceWorkOrderProfit[] {
  const revenueByOrder = new Map<string, number>();
  const partsByOrder = new Map<string, number>();

  for (const { operation } of current) {
    const orderId = operation.relatedWorkOrderId;
    if (!orderId) continue;
    if (isIncome(operation)) {
      revenueByOrder.set(orderId, (revenueByOrder.get(orderId) ?? 0) + operation.amount);
    } else if (operation.category === 'work_order_parts_cost') {
      partsByOrder.set(orderId, (partsByOrder.get(orderId) ?? 0) + operation.amount);
    }
  }

  // Labor cost belongs to the order as a unit, so payroll is attributed in full
  // rather than sliced by the display window.
  const laborByOrder = new Map<string, number>();
  for (const entry of payroll) {
    if (entry.status === 'cancelled') continue;
    laborByOrder.set(entry.workOrderId, (laborByOrder.get(entry.workOrderId) ?? 0) + entry.amount);
  }

  const orderById = new Map(orders.map((order) => [order.id, order]));

  return [...revenueByOrder.entries()]
    .map(([orderId, revenue]) => {
      const order = orderById.get(orderId);
      const partsCost = partsByOrder.get(orderId) ?? 0;
      const laborCost = laborByOrder.get(orderId) ?? 0;
      const cost = partsCost + laborCost;
      const profit = revenue - cost;
      return {
        id: orderId,
        label: order?.number ? `Order №${order.number}` : 'Work order',
        client: order?.clientName?.trim() || order?.vehicleLabel?.trim() || '—',
        revenue,
        partsCost,
        laborCost,
        cost,
        profit,
        margin: revenue > 0 ? profit / revenue : null,
        laborRecorded: laborByOrder.has(orderId),
      } satisfies FinanceWorkOrderProfit;
    })
    .sort((left, right) => right.profit - left.profit);
}

export function buildProfitability(
  current: DatedOperation[],
  previous: DatedOperation[],
  orders: WorkOrder[],
  payroll: PayrollTransaction[],
): FinanceProfitability {
  const workOrders = buildWorkOrderProfitability(current, orders, payroll);
  return {
    engines: buildEngineProfitability(current, previous),
    workOrders,
    workOrderRevenue: workOrders.reduce((sum, entry) => sum + entry.revenue, 0),
    workOrderProfit: workOrders.reduce((sum, entry) => sum + entry.profit, 0),
  };
}
