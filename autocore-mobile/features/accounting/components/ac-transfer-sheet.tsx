import {
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { ChevronDownIcon } from '@/assets/icons';
import { Text } from '@/components/ui';
import { useAppDisplayCurrency, useModalBottomSheet, useTheme } from '@/hooks';
import { accountOptions, operationAccountLabel } from '@/lib/accounting/labels';
import { appDisplayCurrencyAffix } from '@/lib/money/display-currency';
import { createFinancialOperation } from '@/services/accounting/create-financial-operation';
import { haptics, tokens } from '@/theme';
import type { OperationAccount } from '@/types/financial-operation';

import { CoAmountField } from './co-amount-field';
import { OPERATION_ACCOUNT_GLYPHS } from './co-operation-glyphs';
import { CoCommentField } from './co-comment-field';
import { CoCard, CoSection } from './co-section';
import { CoSheetHeader, type CoSubmitPhase } from './co-sheet-header';
import { CoTypeSelector } from './co-type-selector';

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

const SUCCESS_HOLD_MS = 420;

function parseAmountInput(value: string): number {
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  return Number(normalized);
}

function oppositeAccount(account: OperationAccount): OperationAccount {
  return account === 'cashbox' ? 'kaspi' : 'cashbox';
}

export const AcTransferSheet = forwardRef<AcTransferSheetRef, AcTransferSheetProps>(
  function AcTransferSheet({ companyId, userId, disabled = false, onCreated }, ref) {
    const { colors } = useTheme();
    const sheet = useModalBottomSheet();
    const sheetRef = useRef<BottomSheetModal>(null);

    const [fromAccount, setFromAccount] = useState<OperationAccount>('cashbox');
    const [amount, setAmount] = useState('');
    const [comment, setComment] = useState('');
    const [phase, setPhase] = useState<CoSubmitPhase>('idle');
    const [scrolled, setScrolled] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { currency } = useAppDisplayCurrency();
    const affix = appDisplayCurrencyAffix(currency);
    const currencyMark = affix.suffix.trim() || affix.prefix.trim();

    const toAccount = oppositeAccount(fromAccount);
    const toLabel = operationAccountLabel(toAccount);
    const fromLabel = operationAccountLabel(fromAccount);
    const parsedAmount = parseAmountInput(amount);
    const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;
    const canSubmit = !disabled && amountValid && phase === 'idle';

    const resetForm = useCallback(() => {
      setFromAccount('cashbox');
      setAmount('');
      setComment('');
      setError(null);
      setPhase('idle');
      setScrolled(false);
    }, []);

    useImperativeHandle(ref, () => ({
      present: () => {
        if (disabled) return;
        resetForm();
        sheetRef.current?.present();
      },
      dismiss: () => sheetRef.current?.dismiss(),
    }));

    const dismiss = useCallback(() => {
      haptics.selection();
      sheetRef.current?.dismiss();
    }, []);

    const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = event.nativeEvent.contentOffset.y > 6;
      setScrolled((current) => (current === next ? current : next));
    }, []);

    const onSubmit = useCallback(async () => {
      if (!amountValid || phase !== 'idle') {
        if (!amountValid) setError('Enter a valid amount');
        return;
      }

      setPhase('submitting');
      setError(null);
      haptics.light();

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
        setPhase('success');
        onCreated?.();

        setTimeout(() => {
          sheetRef.current?.dismiss();
        }, SUCCESS_HOLD_MS);
      } catch (nextError) {
        haptics.warning();
        setPhase('idle');
        setError(nextError instanceof Error ? nextError.message : 'Failed to complete the transfer');
      }
    }, [
      amountValid,
      comment,
      companyId,
      fromAccount,
      fromLabel,
      onCreated,
      parsedAmount,
      phase,
      toAccount,
      toLabel,
      userId,
    ]);

    return (
      <BottomSheetModal
        ref={sheetRef}
        {...sheet.sheetLayout}
        index={0}
        snapPoints={sheet.formSnapPoints}
        topInset={sheet.topInset}
        enablePanDownToClose={phase === 'idle'}
        backdropComponent={sheet.renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.background }}
        handleIndicatorStyle={sheet.handleIndicatorStyle}
        onDismiss={resetForm}
      >
        <CoSheetHeader
          title="Move funds"
          onCancel={dismiss}
          onSubmit={() => void onSubmit()}
          submitLabel="Move"
          successLabel="Moved"
          canSubmit={canSubmit}
          phase={phase}
          scrolled={scrolled}
        />

        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          onScroll={onScroll}
          contentContainerStyle={{
            paddingHorizontal: tokens.space.screenX,
            paddingTop: tokens.space.stack,
            paddingBottom: sheet.sheetContentBottom,
            gap: tokens.space.stack + 2,
          }}
        >
          <CoSection title="Accounts">
            <CoCard style={{ gap: tokens.space.stack }}>
              <View style={{ gap: tokens.space.inline }}>
                <Text variant="caption1" color="muted" style={{ fontWeight: '600' }}>
                  From
                </Text>
                <CoTypeSelector
                  accessibilityLabel="From account"
                  segments={accountOptions()}
                  icons={OPERATION_ACCOUNT_GLYPHS}
                  value={fromAccount}
                  onValueChange={(value) => setFromAccount(value as OperationAccount)}
                />
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: tokens.space.inline,
                  paddingLeft: tokens.space.micro,
                }}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.secondary,
                  }}
                >
                  <ChevronDownIcon size={16} color={colors.mutedForeground} strokeWidth={2} />
                </View>
                <Text variant="footnote" color="muted">
                  Moves to the other account instantly
                </Text>
              </View>

              <View style={{ gap: tokens.space.micro + 2 }}>
                <Text variant="caption1" color="muted" style={{ fontWeight: '600' }}>
                  To
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: tokens.space.inline,
                    paddingVertical: tokens.space[3],
                    paddingHorizontal: tokens.space[3.5],
                    borderRadius: tokens.radius.group,
                    backgroundColor: colors.secondary,
                  }}
                >
                  {(() => {
                    // Same glyph the From control uses, so the destination is
                    // recognised by shape rather than re-read as a word.
                    const ToGlyph = OPERATION_ACCOUNT_GLYPHS[toAccount];
                    return <ToGlyph size={16} color={colors.primary} strokeWidth={2} />;
                  })()}
                  <Text variant="body" style={{ fontWeight: '600', flex: 1 }}>
                    {toLabel}
                  </Text>
                  <Text variant="caption1" color="muted">
                    {fromLabel} → {toLabel}
                  </Text>
                </View>
              </View>
            </CoCard>
          </CoSection>

          <CoSection title="Amount">
            <CoCard>
              <CoAmountField
                value={amount}
                onChangeText={(value) => {
                  setAmount(value);
                  if (error) setError(null);
                }}
                currency={currencyMark}
                direction="out"
                autoFocus
              />
            </CoCard>
          </CoSection>

          <CoSection title="Note">
            <CoCard>
              <CoCommentField
                value={comment}
                onChangeText={setComment}
                placeholder="What is this transfer for? (optional)"
                variant="plain"
              />
            </CoCard>
          </CoSection>

          {error ? (
            <CoCard style={{ backgroundColor: colors.dangerSubtle }}>
              <Text variant="footnote" style={{ color: colors.dangerOnSubtle, fontWeight: '500' }}>
                {error}
              </Text>
            </CoCard>
          ) : null}

          <Text variant="caption1" color="muted" style={{ paddingHorizontal: tokens.space.micro }}>
            Creates two ledger rows — a withdrawal from {fromLabel.toLowerCase()} and a deposit into{' '}
            {toLabel.toLowerCase()}. Transfers never affect profit.
          </Text>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);
