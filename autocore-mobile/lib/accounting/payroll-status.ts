import type { PayrollTransactionStatus } from '@/types/payroll-transaction';

export const PAYROLL_STATUS_LABELS: Record<PayrollTransactionStatus, string> = {
  pending: 'К выплате',
  paid: 'Выплачено',
  cancelled: 'Не выплачивать',
};

export function nextPayrollStatus(current: PayrollTransactionStatus): PayrollTransactionStatus {
  if (current === 'pending') return 'paid';
  if (current === 'paid') return 'cancelled';
  return 'pending';
}
