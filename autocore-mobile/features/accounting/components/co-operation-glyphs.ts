import {
  BanknoteIcon,
  CreditCardIcon,
  LandmarkIcon,
  SplitIcon,
  TagIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  Undo2Icon,
  type IconProps,
} from '@/assets/icons';
import type { CreatableOperationType } from '@/lib/accounting/labels';
import type { OperationAccount, PaymentMethod } from '@/types/financial-operation';

type Glyph = React.ComponentType<IconProps>;

/**
 * Glyphs for the ledger's mutually exclusive choices.
 *
 * A segmented control is scanned, not read — at a glance the shape lands before
 * the word does. Cash and card keep the same glyph wherever they appear, so the
 * account row and the payment row teach each other rather than competing.
 */
export const OPERATION_TYPE_GLYPHS: Record<CreatableOperationType, Glyph> = {
  expense: TrendingDownIcon,
  income: TrendingUpIcon,
  sale: TagIcon,
  refund: Undo2Icon,
};

export const OPERATION_ACCOUNT_GLYPHS: Record<OperationAccount, Glyph> = {
  cashbox: BanknoteIcon,
  kaspi: CreditCardIcon,
};

export const PAYMENT_METHOD_GLYPHS: Record<PaymentMethod, Glyph> = {
  cash: BanknoteIcon,
  // A bank building, not an arrow: the arrow already means "direction of money"
  // everywhere else in the ledger.
  transfer: LandmarkIcon,
  mixed: SplitIcon,
};
