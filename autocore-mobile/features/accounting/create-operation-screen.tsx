import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { Button, KeyboardFormShell, Text, toast } from '@/components/ui';
import { useAppDisplayCurrency, useSession, useTheme } from '@/hooks';
import { useAccountingPreferences } from '@/hooks/use-accounting-preferences';
import { appendAdvanceMarker } from '@/lib/accounting/advances';
import {
  ACCOUNTING_CATEGORY_SUGGESTIONS,
  accountOptions,
  creatableTypeOptions,
  operationCategoryLabel,
  operationDirection,
  paymentMethodOptions,
  resolveOperationCategoryValue,
} from '@/lib/accounting/labels';
import {
  accountForPaymentMethod,
  buildMixedPaymentFields,
  defaultMixedSplit,
  isValidMixedSplit,
} from '@/lib/accounting/mixed-payment';
import { APP_MONEY_BASE_CURRENCY, convertToBaseCurrency } from '@/lib/money/exchange-rates';
import { appDisplayCurrencyAffix, formatAppMoney } from '@/lib/money/display-currency';
import { createFinancialOperation } from '@/services/accounting/create-financial-operation';
import { haptics, tokens } from '@/theme';
import type { CreatableOperationType } from '@/lib/accounting/labels';
import type { OperationAccount, PaymentMethod } from '@/types/financial-operation';

import { CoAmountField } from './components/co-amount-field';
import { CoCategoryField } from './components/co-category-field';
import { CoCommentField } from './components/co-comment-field';
import { CoMixedSplit } from './components/co-mixed-split';
import { CoCard, CoSection } from './components/co-section';
import { CoSheetHeader, type CoSubmitPhase } from './components/co-sheet-header';
import { CoToggleRow } from './components/co-toggle-row';
import { CoTypeSelector } from './components/co-type-selector';
import type { NewOperationPreset } from './navigation';

/**
 * How long the confirmed pill stays on screen before the sheet closes — long
 * enough for the tick to land and be read, short enough not to add to a wait
 * the user has already sat through.
 */
const SUCCESS_HOLD_MS = 420;

/**
 * How long the sheet waits for the server to acknowledge the write.
 *
 * `FirestoreNetworkHead` pauses Firestore's network on a committed offline
 * reading so writes queue in memory rather than failing. A queued write's
 * promise then never settles, which left the spinner running forever with no
 * way out. Past this window the entry is already in the ledger locally, so the
 * sheet closes and says plainly that it has not synced yet.
 */
const SERVER_ACK_TIMEOUT_MS = 6000;

function waitFor(ms: number): Promise<'queued'> {
  return new Promise((resolve) => setTimeout(() => resolve('queued'), ms));
}

function parseAmountInput(value: string): number {
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  return Number(normalized);
}

function readPreset(params: Record<string, string | string[] | undefined>): NewOperationPreset {
  const pick = (key: string) => {
    const value = params[key];
    return typeof value === 'string' ? value : undefined;
  };

  return {
    type: pick('type') as CreatableOperationType | undefined,
    account: pick('account') as OperationAccount | undefined,
    paymentMethod: pick('paymentMethod') as PaymentMethod | undefined,
    category: pick('category'),
    comment: pick('comment'),
    markAsAdvance: pick('markAsAdvance') === '1',
  };
}

const BUILTIN_CATEGORY_SUGGESTIONS = ACCOUNTING_CATEGORY_SUGGESTIONS.map((item) =>
  operationCategoryLabel(item),
);

/**
 * Compose a ledger entry as a native form sheet over Accounting (NativeTabs).
 * Cancel / Create live in the system header — the sheet itself is the chrome.
 */
export function CreateOperationScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { profile, can } = useSession();
  const rawParams = useLocalSearchParams<Record<string, string>>();
  const preset = useMemo(() => readPreset(rawParams), [rawParams]);
  const { employees, specifics } = useAccountingPreferences(profile?.id);

  const categorySuggestions = useMemo(() => {
    const seen = new Set<string>();
    const next: string[] = [];
    for (const item of [...employees, ...specifics, ...BUILTIN_CATEGORY_SUGGESTIONS]) {
      const label = item.trim();
      if (!label) continue;
      const key = label.toLocaleLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      next.push(label);
    }
    return next;
  }, [employees, specifics]);

  const [type, setType] = useState<CreatableOperationType>(preset.type ?? 'expense');
  const [amount, setAmount] = useState('');
  const [account, setAccount] = useState<OperationAccount>(preset.account ?? 'cashbox');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(preset.paymentMethod ?? 'cash');
  const [mixedCashPortion, setMixedCashPortion] = useState(0);
  const [categoryInput, setCategoryInput] = useState(
    preset.category ? operationCategoryLabel(preset.category) : '',
  );
  const [comment, setComment] = useState(preset.comment ?? '');
  const [markAsAdvance, setMarkAsAdvance] = useState(preset.markAsAdvance ?? false);
  const [phase, setPhase] = useState<CoSubmitPhase>('idle');
  const [scrolled, setScrolled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    },
    [],
  );

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = event.nativeEvent.contentOffset.y > 6;
    setScrolled((current) => (current === next ? current : next));
  }, []);

  const canEdit = can('accounting_edit');
  const direction = operationDirection(type);
  const isMixed = paymentMethod === 'mixed';

  const { currency, rates } = useAppDisplayCurrency();
  const affix = appDisplayCurrencyAffix(currency);
  const currencyMark = affix.suffix.trim() || affix.prefix.trim();

  const enteredAmount = parseAmountInput(amount);
  const amountValid = Number.isFinite(enteredAmount) && enteredAmount > 0;
  const baseAmount = convertToBaseCurrency(enteredAmount, currency, rates);
  const baseAmountHint =
    currency === APP_MONEY_BASE_CURRENCY || !amountValid
      ? null
      : `Recorded as ${formatAppMoney(baseAmount, APP_MONEY_BASE_CURRENCY)}`;
  const mixedValid = !isMixed || isValidMixedSplit(baseAmount, mixedCashPortion);

  function selectPaymentMethod(next: PaymentMethod) {
    setPaymentMethod(next);
    if (next === 'mixed') {
      const split = defaultMixedSplit(amountValid ? baseAmount : 0);
      setMixedCashPortion(split.cash);
      setAccount(accountForPaymentMethod(next, account, split));
      return;
    }
    setAccount(accountForPaymentMethod(next, account));
  }

  useEffect(() => {
    if (!isMixed || !amountValid) return;
    if (mixedCashPortion > 0 && mixedCashPortion < baseAmount) return;
    setMixedCashPortion(defaultMixedSplit(baseAmount).cash);
  }, [amountValid, baseAmount, isMixed, mixedCashPortion]);

  const dismiss = useCallback(() => {
    haptics.selection();
    router.back();
  }, [router]);

  const onSubmit = useCallback(async () => {
    if (!profile?.id || !profile.companyId) return;

    if (!amountValid) {
      setError('Enter a valid amount');
      return;
    }
    if (isMixed && !isValidMixedSplit(baseAmount, mixedCashPortion)) {
      setError('Split the amount between cash and card — both parts must be greater than zero.');
      return;
    }

    setPhase('submitting');
    setError(null);
    haptics.light();

    try {
      const normalized = markAsAdvance
        ? appendAdvanceMarker(resolveOperationCategoryValue(categoryInput), comment)
        : {
            category: resolveOperationCategoryValue(categoryInput),
            comment: comment.trim(),
          };

      const payment = buildMixedPaymentFields(
        paymentMethod,
        account,
        baseAmount,
        mixedCashPortion,
      );

      const pending = createFinancialOperation(profile.companyId, profile.id, {
        type,
        amount: baseAmount,
        account: payment.account,
        paymentMethod: payment.paymentMethod,
        cashReceived: payment.cashReceived,
        category: normalized.category || null,
        comment: normalized.comment || null,
      });

      const outcome = await Promise.race([
        pending.then(() => 'acked' as const),
        waitFor(SERVER_ACK_TIMEOUT_MS),
      ]);

      if (outcome === 'queued') {
        // The row is already in the ledger from the local write; only the
        // server round trip is outstanding. Claiming "Added" here would
        // overstate it, so the sheet closes on the truth instead.
        void pending.catch((syncError: unknown) => {
          toast({
            title: 'Operation failed to sync',
            description:
              syncError instanceof Error ? syncError.message : 'It was not saved to the server.',
            variant: 'destructive',
          });
        });
        haptics.light();
        toast({
          title: 'Saved on this iPhone',
          description: 'It will sync as soon as the connection is back.',
          variant: 'warning',
        });
        router.back();
        return;
      }

      haptics.success();
      // Confirm on the control the user just pressed, then hand off to the
      // existing dismiss + toast. The button stays disabled throughout, so the
      // hold cannot be used to submit twice.
      setPhase('success');
      dismissTimer.current = setTimeout(() => {
        toast({ title: 'Operation saved', variant: 'success' });
        router.back();
      }, SUCCESS_HOLD_MS);
    } catch (nextError) {
      haptics.warning();
      setError(nextError instanceof Error ? nextError.message : 'Failed to create the operation');
      setPhase('idle');
    }
  }, [
    account,
    amountValid,
    baseAmount,
    categoryInput,
    comment,
    isMixed,
    markAsAdvance,
    mixedCashPortion,
    paymentMethod,
    profile?.companyId,
    profile?.id,
    router,
    type,
  ]);

  const canSubmit = canEdit && amountValid && mixedValid && phase === 'idle';

  if (!canEdit) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <CoSheetHeader title="New Operation" onCancel={dismiss} />
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: tokens.space.section,
          }}
        >
          <Text variant="body" color="muted" style={{ textAlign: 'center' }}>
            You don't have permission to create operations
          </Text>
          <Button
            variant="outline"
            native={false}
            onPress={dismiss}
            style={{ marginTop: tokens.space.stack }}
          >
            Close
          </Button>
        </View>
      </View>
    );
  }

  return (
    <KeyboardFormShell
      backgroundColor={colors.background}
      contentInsetAdjustmentBehavior="never"
      onScroll={onScroll}
      scrollEventThrottle={16}
      header={
        <CoSheetHeader
          title="New Operation"
          onCancel={dismiss}
          onSubmit={() => void onSubmit()}
          canSubmit={canSubmit}
          phase={phase}
          scrolled={scrolled}
        />
      }
      contentContainerStyle={{
        paddingHorizontal: tokens.space.screenX,
        paddingTop: tokens.space.stack,
        paddingBottom: tokens.space.section,
        gap: tokens.space.stack + 2,
      }}
    >
      <CoSection title="Type">
        <CoCard style={{ gap: tokens.space.stack }}>
          <CoTypeSelector
            accessibilityLabel="Operation type"
            segments={creatableTypeOptions()}
            value={type}
            onValueChange={(next) => setType(next as CreatableOperationType)}
          />
          <View style={{ gap: tokens.space.inline }}>
            <CoAmountField
              value={amount}
              onChangeText={setAmount}
              currency={currencyMark}
              direction={direction}
            />
            {baseAmountHint ? (
              <Text variant="caption1" color="muted">
                {baseAmountHint}
              </Text>
            ) : null}
          </View>
        </CoCard>
      </CoSection>

      <CoSection title="Accounts">
        <CoCard style={{ gap: tokens.space.stack }}>
          {!isMixed ? (
            <View style={{ gap: tokens.space.inline }}>
              <Text variant="caption1" color="muted" style={{ fontWeight: '600' }}>
                Account
              </Text>
              <CoTypeSelector
                accessibilityLabel="Account"
                segments={accountOptions()}
                value={account}
                onValueChange={(next) => setAccount(next as OperationAccount)}
              />
            </View>
          ) : null}

          <View style={{ gap: tokens.space.inline }}>
            <Text variant="caption1" color="muted" style={{ fontWeight: '600' }}>
              Payment method
            </Text>
            <CoTypeSelector
              accessibilityLabel="Payment method"
              segments={paymentMethodOptions()}
              value={paymentMethod}
              onValueChange={(next) => selectPaymentMethod(next as PaymentMethod)}
            />
          </View>

          {isMixed ? (
            <CoMixedSplit
              total={amountValid ? baseAmount : 0}
              cashPortion={mixedCashPortion}
              onCashPortionChange={setMixedCashPortion}
              currencyMark={currencyMark || '$'}
              direction={direction}
            />
          ) : null}
        </CoCard>
      </CoSection>

      <CoSection title="Category">
        <CoCard>
          <CoCategoryField
            value={categoryInput}
            onValueChange={setCategoryInput}
            suggestions={categorySuggestions}
            bleed={tokens.space.stack + 2}
          />
        </CoCard>
      </CoSection>

      <CoSection title="Comment">
        <CoCard>
          <CoCommentField value={comment} onChangeText={setComment} variant="plain" />
        </CoCard>
      </CoSection>

      <CoSection title="Options">
        <CoCard bare>
          <CoToggleRow
            label="Mark as advance"
            helper="Counts against an employee advance instead of a regular payout."
            value={markAsAdvance}
            onValueChange={setMarkAsAdvance}
          />
        </CoCard>
      </CoSection>

      {error ? (
        <Text variant="caption1" color="destructive">
          {error}
        </Text>
      ) : null}
    </KeyboardFormShell>
  );
}
