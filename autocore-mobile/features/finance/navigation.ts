import type { Href } from 'expo-router';

import type { FinanceFlowNodeId } from './types';

/** Metric detail ids — trends, net profit, and the health index itself. */
export type FinanceMetricRouteId = 'health' | 'margin' | 'revenue' | 'costs' | 'cash' | 'net';

export function financeMetricHref(id: FinanceMetricRouteId): Href {
  return { pathname: '/(tabs)/accounting/metric/[id]', params: { id } } as Href;
}

export function financeFlowHref(id: FinanceFlowNodeId): Href {
  return { pathname: '/(tabs)/accounting/flow/[id]', params: { id } } as Href;
}

export const FINANCE_LEDGER_HREF = '/(tabs)/accounting/ledger' as Href;

export const FINANCE_ROOT_HREF = '/(tabs)/accounting' as Href;
