import type { FinanceFlow, FinanceFlowNode, FinanceFlowNodeId } from '../types';
import {
  CHANNEL_ORDER,
  COST_ORDER,
  costGroup,
  flowNode,
  flowNodeLabel,
  isIncome,
  revenueChannel,
} from './classify';
import type { DatedOperation } from './series';

type Bucket = { amount: number; count: number };

function bucketBy(
  dated: DatedOperation[],
  pick: (entry: DatedOperation) => FinanceFlowNodeId | null,
): Map<FinanceFlowNodeId, Bucket> {
  const map = new Map<FinanceFlowNodeId, Bucket>();
  for (const entry of dated) {
    const key = pick(entry);
    if (!key) continue;
    const bucket = map.get(key) ?? { amount: 0, count: 0 };
    bucket.amount += entry.operation.amount;
    bucket.count += 1;
    map.set(key, bucket);
  }
  return map;
}

function toNodes(
  order: readonly FinanceFlowNodeId[],
  current: Map<FinanceFlowNodeId, Bucket>,
  previous: Map<FinanceFlowNodeId, Bucket>,
  total: number,
): FinanceFlowNode[] {
  return order
    .map((id) => {
      const bucket = current.get(id);
      return {
        id,
        label: flowNodeLabel(id),
        amount: bucket?.amount ?? 0,
        count: bucket?.count ?? 0,
        share: total > 0 ? (bucket?.amount ?? 0) / total : 0,
        previous: previous.get(id)?.amount ?? 0,
      };
    })
    .filter((node) => node.amount > 0 || node.previous > 0)
    .sort((left, right) => right.amount - left.amount);
}

/**
 * Revenue splits into the channels it came through, costs into the groups they
 * left by, and the difference is the same net profit the chart plots.
 */
export function buildFlow(current: DatedOperation[], previous: DatedOperation[]): FinanceFlow {
  const revenueNow = bucketBy(current, (entry) =>
    isIncome(entry.operation) ? revenueChannel(entry.operation) : null,
  );
  const revenueBefore = bucketBy(previous, (entry) =>
    isIncome(entry.operation) ? revenueChannel(entry.operation) : null,
  );
  const costNow = bucketBy(current, (entry) =>
    entry.operation.type === 'transfer' || isIncome(entry.operation)
      ? null
      : costGroup(entry.operation),
  );
  const costBefore = bucketBy(previous, (entry) =>
    entry.operation.type === 'transfer' || isIncome(entry.operation)
      ? null
      : costGroup(entry.operation),
  );

  const revenue = sum(revenueNow);
  const cost = sum(costNow);

  return {
    revenue,
    cost,
    net: revenue - cost,
    channels: toNodes(CHANNEL_ORDER, revenueNow, revenueBefore, revenue),
    costs: toNodes(COST_ORDER, costNow, costBefore, cost),
  };
}

function sum(map: Map<FinanceFlowNodeId, Bucket>): number {
  let total = 0;
  for (const bucket of map.values()) total += bucket.amount;
  return total;
}

/** Operations belonging to one flow node — the drill-down source of truth. */
export function operationsForNode(
  dated: DatedOperation[],
  node: FinanceFlowNodeId,
): DatedOperation[] {
  return dated
    .filter((entry) => entry.operation.type !== 'transfer' && flowNode(entry.operation) === node)
    .sort((left, right) => right.at.getTime() - left.at.getTime());
}
