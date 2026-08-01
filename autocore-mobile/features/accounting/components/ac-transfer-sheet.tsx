import {
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { View } from 'react-native';

import { Button, Dropdown, Input, Text } from '@/components/ui';
import { useModalBottomSheet } from '@/hooks';
import { accountOptions, operationAccountLabel } from '@/lib/accounting/labels';
import { createFinancialOperation } from '@/services/accounting/create-financial-operation';
import { haptics } from '@/theme';
import type { OperationAccount } from '@/types/financial-operation';

export type AcTransferSheetRef = {
  present: () => void;
  dismiss: () => void;
};

type AcTransferSheetProps = {
  companyId: string;
  userId: string;
  disabled?: boolean;
  onCreated?: () => void;
};

function parseAmountInput(value: string): number {
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  return Number(normalized);
}

function oppositeAccount(account: OperationAccount): OperationAccount {
  return account === 'cashbox' ? 'kaspi' : 'cashbox';
}

export const AcTransferSheet = forwardRef<AcTransferSheetRef, AcTransferSheetProps>(
  function AcTransferSheet({ companyId, userId, disabled = false, onCreated }, ref) {
    const sheet = useModalBottomSheet();
    const sheetRef = useRef<BottomSheetModal>(null);

    const [fromAccount, setFromAccount] = useState<OperationAccount>('cashbox');
    const [amount, setAmount] = useState('');
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toAccount = oppositeAccount(fromAccount);
    const toLabel = operationAccountLabel(toAccount);

    const resetForm = useCallback(() => {
      setFromAccount('cashbox');
      setAmount('');
      setComment('');
      setError(null);
    }, []);

    useImperativeHandle(ref, () => ({
      present: () => {
        if (disabled) return;
        resetForm();
        sheetRef.current?.present();
      },
      dismiss: () => sheetRef.current?.dismiss(),
    }));

    const renderBackdrop = sheet.renderBackdrop;

    async function onSubmit() {
      const parsedAmount = parseAmountInput(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        setError('Enter a valid amount');
        return;
      }

      setSubmitting(true);
      setError(null);
      haptics.light();

      const fromLabel = operationAccountLabel(fromAccount);
      const toLabel = operationAccountLabel(toAccount);
      const note = comment.trim() || `Transfer: ${fromLabel} → ${toLabel}`;

      try {
        await createFinancialOperation(companyId, userId, {
          type: 'expense',
          amount: parsedAmount,
          account: fromAccount,
          paymentMethod: 'transfer',
          category: 'transfer',
          comment: note,
        });
        await createFinancialOperation(companyId, userId, {
          type: 'income',
          amount: parsedAmount,
          account: toAccount,
          paymentMethod: 'transfer',
          category: 'transfer',
          comment: note,
        });

        haptics.success();
        sheetRef.current?.dismiss();
        onCreated?.();
      } catch (nextError) {
        haptics.warning();
        setError(nextError instanceof Error ? nextError.message : 'Failed to complete the transfer');
      } finally {
        setSubmitting(false);
      }
    }

    return (
      <BottomSheetModal
        ref={sheetRef}
        {...sheet.sheetLayout}
        index={0}
        snapPoints={sheet.formSnapPoints}
        topInset={sheet.topInset}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={sheet.backgroundStyle}
        handleIndicatorStyle={sheet.handleIndicatorStyle}
      >
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={sheet.formContentStyle}
        >
          <View style={{ gap: 4 }}>
            <Text variant="heading" style={{ fontSize: 20, fontWeight: '700' }}>
              Transfer Between Accounts
            </Text>
            <Text variant="caption" color="muted" style={{ fontSize: 13 }}>
              Withdraw from one account and deposit into another.
            </Text>
          </View>

          <View style={{ gap: 6 }}>
            <Text variant="caption" color="muted">
              From Account
            </Text>
            <Dropdown
              value={fromAccount}
              onValueChange={(value) => setFromAccount(value as OperationAccount)}
              options={accountOptions()}
            />
          </View>

          <View style={{ gap: 6 }}>
            <Text variant="caption" color="muted">
              To Account
            </Text>
            <Text variant="bodyStrong">{toLabel}</Text>
          </View>

          <View style={{ gap: 6 }}>
            <Text variant="caption" color="muted">
              Amount
            </Text>
            <Input value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" />
          </View>

          <View style={{ gap: 6 }}>
            <Text variant="caption" color="muted">
              Comment
            </Text>
            <Input value={comment} onChangeText={setComment} placeholder="Optional" />
          </View>

          {error ? (
            <Text variant="caption" color="destructive">
              {error}
            </Text>
          ) : null}

          <Button loading={submitting} disabled={disabled || submitting} onPress={() => void onSubmit()}>
            Transfer
          </Button>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);
