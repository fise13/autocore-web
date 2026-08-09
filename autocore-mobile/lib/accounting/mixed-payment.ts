import type {
  FinancialOperation,
  OperationAccount,
  OperationType,
  PaymentMethod,
} from '@/types/financial-operation';

export type MixedSplit = {
  cash: number;
  transfer: number;
};

const MONEY_EPS = 0.005;

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function defaultMixedSplit(total: number): MixedSplit {
  if (!Number.isFinite(total) || total <= 0) return { cash: 0, transfer: 0 };
  const cash = roundMoney(total / 2);
  return { cash, transfer: roundMoney(total - cash) };
}

export function splitFromCashPortion(total: number, cashPortion: number): MixedSplit {
  if (!Number.isFinite(total) || total <= 0) return { cash: 0, transfer: 0 };
  const cash = roundMoney(Math.min(Math.max(0, cashPortion), total));
  return { cash, transfer: roundMoney(total - cash) };
}

export function splitFromTransferPortion(total: number, transferPortion: number): MixedSplit {
  if (!Number.isFinite(total) || total <= 0) return { cash: 0, transfer: 0 };
  const transfer = roundMoney(Math.min(Math.max(0, transferPortion), total));
  return { cash: roundMoney(total - transfer), transfer };
}

export function isValidMixedSplit(total: number, cashPortion: number): boolean {
  if (!Number.isFinite(total) || total <= 0) return false;
  const { cash, transfer } = splitFromCashPortion(total, cashPortion);
  return cash > MONEY_EPS && transfer > MONEY_EPS && Math.abs(cash + transfer - total) < MONEY_EPS;
}

export function mixedPrimaryAccount(split: MixedSplit): OperationAccount {
  return split.cash >= split.transfer ? 'cashbox' : 'kaspi';
}

export function accountForPaymentMethod(
  paymentMethod: PaymentMethod,
  current: OperationAccount,
  mixedSplit?: MixedSplit | null,
): OperationAccount {
  if (paymentMethod === 'cash') return 'cashbox';
  if (paymentMethod === 'transfer') return 'kaspi';
  if (paymentMethod === 'mixed' && mixedSplit) return mixedPrimaryAccount(mixedSplit);
  return current;
}

export function mixedCashPortion(
  operation: Pick<FinancialOperation, 'paymentMethod' | 'amount' | 'cashReceived'>,
): number | null {
  if (operation.paymentMethod !== 'mixed') return null;
  if (operation.cashReceived == null || !Number.isFinite(operation.cashReceived)) return null;
  const cash = roundMoney(operation.cashReceived);
  if (cash <= 0 || cash >= operation.amount) return null;
  return cash;
}

export function mixedTransferPortion(
  operation: Pick<FinancialOperation, 'paymentMethod' | 'amount' | 'cashReceived'>,
): number | null {
  const cash = mixedCashPortion(operation);
  if (cash == null) return null;
  return roundMoney(operation.amount - cash);
}

export function operationTouchesAccount(
  operation: Pick<FinancialOperation, 'paymentMethod' | 'amount' | 'cashReceived' | 'account'>,
  account: OperationAccount,
): boolean {
  const cash = mixedCashPortion(operation);
  if (cash == null) return operation.account === account;
  if (account === 'cashbox') return cash > MONEY_EPS;
  return operation.amount - cash > MONEY_EPS;
}

const OUTGOING = new Set<OperationType>(['expense', 'refund']);
const INCOMING = new Set<OperationType>(['income', 'sale']);

export function operationSign(type: OperationType | string): -1 | 0 | 1 {
  if (OUTGOING.has(type as OperationType)) return -1;
  if (INCOMING.has(type as OperationType)) return 1;
  return 0;
}

export function accumulateOperationBalance(
  operation: Pick<
    FinancialOperation,
    'type' | 'amount' | 'account' | 'paymentMethod' | 'cashReceived'
  >,
  balances: { cashbox: number; kaspi: number },
): void {
  const sign = operationSign(operation.type);
  if (sign === 0) return;

  const cash = mixedCashPortion(operation);
  if (cash != null) {
    balances.cashbox += cash * sign;
    balances.kaspi += (operation.amount - cash) * sign;
    return;
  }

  if (operation.account === 'cashbox') balances.cashbox += operation.amount * sign;
  else if (operation.account === 'kaspi') balances.kaspi += operation.amount * sign;
}

export type MixedPaymentPayloadFields = {
  paymentMethod: PaymentMethod;
  account: OperationAccount;
  cashReceived: number | null;
};

export function buildMixedPaymentFields(
  paymentMethod: PaymentMethod,
  account: OperationAccount,
  total: number,
  cashPortion: number | null | undefined,
): MixedPaymentPayloadFields {
  if (paymentMethod !== 'mixed') {
    return {
      paymentMethod,
      account: accountForPaymentMethod(paymentMethod, account),
      cashReceived: null,
    };
  }
  const split = splitFromCashPortion(total, cashPortion ?? defaultMixedSplit(total).cash);
  return {
    paymentMethod: 'mixed',
    account: mixedPrimaryAccount(split),
    cashReceived: split.cash,
  };
}
