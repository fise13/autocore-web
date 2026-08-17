import type { Href } from 'expo-router';

import type { CreatableOperationType } from '@/lib/accounting/labels';
import type { OperationAccount, PaymentMethod } from '@/types/financial-operation';

export type NewOperationPreset = {
  type?: CreatableOperationType;
  account?: OperationAccount;
  paymentMethod?: PaymentMethod;
  category?: string;
  comment?: string;
  markAsAdvance?: boolean;
};

export function newOperationHref(preset?: NewOperationPreset | CreatableOperationType): Href {
  const options: NewOperationPreset = typeof preset === 'string' ? { type: preset } : (preset ?? {});

  const params: Record<string, string> = {};
  if (options.type) params.type = options.type;
  if (options.account) params.account = options.account;
  if (options.paymentMethod) params.paymentMethod = options.paymentMethod;
  if (options.category) params.category = options.category;
  if (options.comment) params.comment = options.comment;
  if (options.markAsAdvance) params.markAsAdvance = '1';

  return {
    pathname: '/finance/new',
    params,
  } as Href;
}
