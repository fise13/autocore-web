import { financialOperationRepository } from '@/services/firestore/financial-operation-repository';
import type { CreateFinancialOperationInput, OperationType } from '@/types/financial-operation';

type CreatePayload = Pick<
  CreateFinancialOperationInput,
  'type' | 'amount' | 'account' | 'paymentMethod' | 'category' | 'comment'
>;

function assertValidPayload(payload: CreatePayload): void {
  if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
    throw new Error('Введите корректную сумму');
  }
}

export async function createFinancialOperation(
  companyId: string,
  userId: string,
  payload: CreatePayload,
): Promise<string> {
  assertValidPayload(payload);

  return financialOperationRepository.create({
    companyId,
    createdByUserId: userId,
    type: payload.type,
    amount: payload.amount,
    account: payload.account,
    paymentMethod: payload.paymentMethod,
    category: payload.category ?? null,
    comment: payload.comment ?? null,
  });
}

export async function createTypedFinancialOperation(
  companyId: string,
  userId: string,
  type: OperationType,
  payload: Omit<CreatePayload, 'type'>,
): Promise<string> {
  return createFinancialOperation(companyId, userId, { ...payload, type });
}
