import type { FinanceChange, FinanceDriver, FinanceFlowNodeId } from '../types';
import {
  CHANNEL_ORDER,
  COST_ORDER,
  flowNode,
  flowNodeLabel,
  isIncome,
  isRevenueNode,
} from './classify';
import type { DatedOperation } from './series';
import { relativeChange } from './series';

/**
 * "What changed" is an exact decomposition, not an attribution guess.
 *
 * Every profit-affecting operation belongs to exactly one flow node, so the
 * signed movement of each node sums back to the net-profit delta to the cent.
 * The UI can therefore claim causality without inventing it.
 */

function sumsByNode(dated: DatedOperation[]): Map<FinanceFlowNodeId, number> {
  const sums = new Map<FinanceFlowNodeId, number>();
  for (const { operation } of dated) {
    if (operation.type === 'transfer') continue;
    const node = flowNode(operation);
    sums.set(node, (sums.get(node) ?? 0) + operation.amount);
  }
  return sums;
}

const MAX_DRIVERS = 4;

export function buildChange(
  current: DatedOperation[],
  previous: DatedOperation[],
): FinanceChange {
  const currentSums = sumsByNode(current);
  const previousSums = sumsByNode(previous);

  const nodes: FinanceFlowNodeId[] = [...CHANNEL_ORDER, ...COST_ORDER];

  const all: FinanceDriver[] = nodes
    .map((node) => {
      const currentValue = currentSums.get(node) ?? 0;
      const previousValue = previousSums.get(node) ?? 0;
      const income = isRevenueNode(node);
      const movement = currentValue - previousValue;
      return {
        id: node,
        label: flowNodeLabel(node),
        contribution: income ? movement : -movement,
        current: currentValue,
        previous: previousValue,
        kind: income ? ('income' as const) : ('cost' as const),
      };
    })
    .filter((driver) => Math.abs(driver.contribution) >= 0.005);

  all.sort((left, right) => Math.abs(right.contribution) - Math.abs(left.contribution));

  const drivers = all.slice(0, MAX_DRIVERS);
  const remainder = all
    .slice(MAX_DRIVERS)
    .reduce((sum, driver) => sum + driver.contribution, 0);

  if (Math.abs(remainder) >= 0.005) {
    drivers.push({
      id: 'other_movements',
      label: 'Everything else',
      contribution: remainder,
      current: 0,
      previous: 0,
      kind: remainder >= 0 ? 'income' : 'cost',
    });
  }

  const currentNet = netOf(current);
  const previousNet = netOf(previous);

  return {
    delta: currentNet - previousNet,
    current: currentNet,
    previous: previousNet,
    deltaPct: relativeChange(previousNet, currentNet),
    drivers,
    noBaseline: previous.length === 0,
  };
}

function netOf(dated: DatedOperation[]): number {
  let net = 0;
  for (const { operation } of dated) {
    if (operation.type === 'transfer') continue;
    net += isIncome(operation) ? operation.amount : -operation.amount;
  }
  return net;
}

/** "Profit rose $420K" / "Profit fell $61K" / "Profit held flat". */
export function changeHeadline(change: FinanceChange, formatMoney: (value: number) => string): string {
  const magnitude = Math.abs(change.delta);
  if (magnitude < 0.005) return 'Profit held flat';
  return `Profit ${change.delta > 0 ? 'rose' : 'fell'} ${formatMoney(magnitude)}`;
}
