/**
 * Where each Home metric and attention row should land.
 *
 * The brief names a specific reading — net profit, waiting parts, quarantine —
 * so the tap opens that screen, not the parent tab.
 */
import type { FinanceMetricRouteId } from '@/features/finance/navigation';

import type { HomeAttentionId, HomeDestination, HomeMetricId } from '../types';

function financeDestination(id: FinanceMetricRouteId): HomeDestination {
  return {
    pathname: '/(tabs)/accounting/metric/[id]',
    params: { id },
  };
}

/** Drill-down for a ranked Summary or Trends metric. */
export function homeMetricDestination(id: HomeMetricId): HomeDestination {
  switch (id) {
    case 'cash.balance':
      return financeDestination('cash');
    case 'money.revenue':
      return financeDestination('revenue');
    case 'money.expense':
      return financeDestination('costs');
    case 'money.net':
      return financeDestination('net');
    case 'orders.open':
      return { pathname: '/orders', params: { filter: 'open' } };
    case 'orders.new':
      return { pathname: '/orders', params: { filter: 'all' } };
    case 'work.assigned_open':
      return { pathname: '/orders', params: { filter: 'open', mine: '1' } };
    case 'engines.available':
      return { pathname: '/objects/engines' };
    case 'engines.aging':
      return { pathname: '/search', params: { filter: 'motors', stale: '1' } };
    case 'parts.available':
      return { pathname: '/warehouse' };
    case 'parts.low_stock':
      return { pathname: '/warehouse', params: { lowStock: '1' } };
    case 'intake.in_progress':
      return { pathname: '/intake', params: { filter: 'active' } };
    case 'earnings.claimable':
      return { pathname: '/earnings' };
  }
}

/** Drill-down for Needs attention rows — aligned with the metric map where they overlap. */
export function homeAttentionDestination(id: HomeAttentionId): HomeDestination {
  switch (id) {
    case 'intake.quarantine':
    case 'intake.awaiting_verification':
      return { pathname: '/intake', params: { filter: 'ready' } };
    case 'intake.rework':
      return { pathname: '/intake', params: { filter: 'active' } };
    case 'orders.waiting_parts':
      return { pathname: '/orders', params: { filter: 'waiting' } };
    case 'parts.low_stock':
      return homeMetricDestination('parts.low_stock');
    case 'engines.aging':
      return homeMetricDestination('engines.aging');
    case 'earnings.claimable':
    case 'payroll.pending':
      return { pathname: '/earnings' };
  }
}
