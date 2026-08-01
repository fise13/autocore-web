import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowLeftIcon } from '@/assets/icons';
import { Button, IconButton, KeyboardFormShell, StickyActionBar, Text, toast } from '@/components/ui';
import { useAppDisplayCurrency, useSession, useTheme } from '@/hooks';
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
import { APP_MONEY_BASE_CURRENCY, convertToBaseCurrency } from '@/lib/money/exchange-rates';
import { appDisplayCurrencyAffix, formatAppMoney } from '@/lib/money/display-currency';
import { createFinancialOperation } from '@/services/accounting/create-financial-operation';
import { haptics, spacing } from '@/theme';
import type { CreatableOperationType } from '@/lib/accounting/labels';
import type { OperationAccount, PaymentMethod } from '@/types/financial-operation';

import { CoAmountField } from './components/co-amount-field';
import { CoCategoryField } from './components/co-category-field';
import { CoCommentField } from './components/co-comment-field';
import { CoCard, CoSection } from './components/co-section';
import { CoToggleRow } from './components/co-toggle-row';
import { CoTypeSelector } from './components/co-type-selector';
import { ac } from './layout';
import type { NewOperationPreset } from './navigation';

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

const CATEGORY_SUGGESTIONS = ACCOUNTING_CATEGORY_SUGGESTIONS.map((item) =>
  operationCategoryLabel(item),
);

export function CreateOperationScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, can } = useSession();
  const rawParams = useLocalSearchParams<Record<string, string>>();
  const preset = useMemo(() => readPreset(rawParams), [rawParams]);

  const [type, setType] = useState<CreatableOperationType>(preset.type ?? 'expense');
  const [amount, setAmount] = useState('');
  const [account, setAccount] = useState<OperationAccount>(preset.account ?? 'cashbox');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(preset.paymentMethod ?? 'cash');
  const [categoryInput, setCategoryInput] = useState(
    preset.category ? operationCategoryLabel(preset.category) : '',
  );
  const [comment, setComment] = useState(preset.comment ?? '');
  const [markAsAdvance, setMarkAsAdvance] = useState(preset.markAsAdvance ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit = can('accounting_edit');
  const direction = operationDirection(type);

  // Amounts are entered in the currency the rest of the app displays, and
  // converted back to the ledger's base currency before they are stored.
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

  async function onSubmit() {
    if (!profile?.id || !profile.companyId) return;

    if (!amountValid) {
      setError('Enter a valid amount');
      return;
    }

    setSubmitting(true);
    setError(null);
    haptics.light();

    try {
      const normalized = markAsAdvance
        ? appendAdvanceMarker(resolveOperationCategoryValue(categoryInput), comment)
        : {
            category: resolveOperationCategoryValue(categoryInput),
            comment: comment.trim(),
          };

      await createFinancialOperation(profile.companyId, profile.id, {
        type,
        amount: baseAmount,
        account,
        paymentMethod,
        category: normalized.category || null,
        comment: normalized.comment || null,
      });

      haptics.success();
      toast({ title: 'Operation saved', variant: 'success' });
      router.back();
    } catch (nextError) {
      haptics.warning();
      setError(nextError instanceof Error ? nextError.message : 'Failed to create the operation');
    } finally {
      setSubmitting(false);
    }
  }

  if (!canEdit) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing[6],
        }}
      >
        <Text variant="body" color="muted" style={{ textAlign: 'center' }}>
          You don't have permission to create operations
        </Text>
        <Button variant="outline" onPress={() => router.back()} style={{ marginTop: spacing[4] }}>
          Back
        </Button>
      </View>
    );
  }

  return (
    <KeyboardFormShell
      backgroundColor={colors.background}
      contentContainerStyle={{
        paddingHorizontal: ac.pad,
        paddingTop: spacing[1],
        paddingBottom: spacing[5],
        gap: spacing[4],
      }}
      header={
        <View
          style={{
            paddingTop: insets.top + spacing[1],
            paddingHorizontal: spacing[2],
            paddingBottom: spacing[1],
          }}
        >
          <IconButton
            accessibilityLabel="Back"
            variant="ghost"
            size="sm"
            onPress={() => router.back()}
          >
            <ArrowLeftIcon size="sm" color={colors.foreground} strokeWidth={2} />
          </IconButton>
        </View>
      }
      footer={
        <StickyActionBar>
          <Button
            size="xl"
            loading={submitting}
            disabled={!amountValid || submitting}
            onPress={() => void onSubmit()}
            style={{ flex: 1 }}
          >
            Create Operation
          </Button>
        </StickyActionBar>
      }
    >
      <View style={{ gap: spacing[1.5], paddingHorizontal: spacing[1] }}>
        <Text
          variant="pageTitle"
          style={{ fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8 }}
        >
          New Operation
        </Text>
        <Text variant="body" color="muted" style={{ fontSize: 14, lineHeight: 19 }}>
          Money moving in or out of the company ledger.
        </Text>
      </View>

      <CoSection title="Transaction">
        <CoCard style={{ gap: spacing[4] }}>
          <CoTypeSelector
            accessibilityLabel="Operation type"
            segments={creatableTypeOptions()}
            value={type}
            onValueChange={(next) => setType(next as CreatableOperationType)}
          />
          <View style={{ gap: spacing[2] }}>
            <CoAmountField
              value={amount}
              onChangeText={setAmount}
              currency={currencyMark}
              direction={direction}
            />
            {baseAmountHint ? (
              <Text variant="caption" color="muted" style={{ fontSize: 13 }}>
                {baseAmountHint}
              </Text>
            ) : null}
          </View>
        </CoCard>
      </CoSection>

      <CoSection title="Accounts">
        <CoCard style={{ gap: spacing[3] }}>
          <View style={{ gap: spacing[1.5] }}>
            <Text variant="caption" color="muted" style={{ fontSize: 13, fontWeight: '600' }}>
              Account
            </Text>
            <CoTypeSelector
              accessibilityLabel="Account"
              segments={accountOptions()}
              value={account}
              onValueChange={(next) => setAccount(next as OperationAccount)}
            />
          </View>

          <View style={{ gap: spacing[1.5] }}>
            <Text variant="caption" color="muted" style={{ fontSize: 13, fontWeight: '600' }}>
              Payment method
            </Text>
            <CoTypeSelector
              accessibilityLabel="Payment method"
              segments={paymentMethodOptions()}
              value={paymentMethod}
              onValueChange={(next) => setPaymentMethod(next as PaymentMethod)}
            />
          </View>
        </CoCard>
      </CoSection>

      <CoSection title="Category">
        <CoCard>
          <CoCategoryField
            value={categoryInput}
            onValueChange={setCategoryInput}
            suggestions={CATEGORY_SUGGESTIONS}
            bleed={spacing[4]}
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
            helper="Counts this operation against an employee advance instead of a regular payout."
            value={markAsAdvance}
            onValueChange={setMarkAsAdvance}
          />
        </CoCard>
      </CoSection>

      {error ? (
        <Text variant="caption" color="destructive" style={{ paddingHorizontal: spacing[1] }}>
          {error}
        </Text>
      ) : null}
    </KeyboardFormShell>
  );
}
