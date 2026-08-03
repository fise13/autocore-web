import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

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
import { APP_MONEY_BASE_CURRENCY, convertToBaseCurrency } from '@/lib/money/exchange-rates';
import { appDisplayCurrencyAffix, formatAppMoney } from '@/lib/money/display-currency';
import { createFinancialOperation } from '@/services/accounting/create-financial-operation';
import { haptics, tokens } from '@/theme';
import type { CreatableOperationType } from '@/lib/accounting/labels';
import type { OperationAccount, PaymentMethod } from '@/types/financial-operation';

import { CoAmountField } from './components/co-amount-field';
import { CoCategoryField } from './components/co-category-field';
import { CoCommentField } from './components/co-comment-field';
import { CoCard, CoSection } from './components/co-section';
import { CoToggleRow } from './components/co-toggle-row';
import { CoTypeSelector } from './components/co-type-selector';
import type { NewOperationPreset } from './navigation';

/** Nav-bar text control — primary tint, 44pt hit, no ghost chrome. */
function SheetNavButton({
  label,
  onPress,
  disabled,
  loading,
  emphasis = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  emphasis?: boolean;
}) {
  const { colors } = useTheme();
  const muted = Boolean(disabled) || Boolean(loading);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: muted, busy: Boolean(loading) }}
      disabled={muted}
      hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
      onPress={onPress}
      style={{
        minHeight: tokens.control.hitTarget,
        minWidth: tokens.control.hitTarget,
        paddingHorizontal: tokens.space.inline,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: muted ? tokens.opacity.disabled : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Text
          variant="body"
          style={{
            fontSize: 17,
            lineHeight: 22,
            fontWeight: emphasis ? '600' : '400',
            color: colors.primary,
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
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
  const { colors, isDark } = useTheme();
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
  const [categoryInput, setCategoryInput] = useState(
    preset.category ? operationCategoryLabel(preset.category) : '',
  );
  const [comment, setComment] = useState(preset.comment ?? '');
  const [markAsAdvance, setMarkAsAdvance] = useState(preset.markAsAdvance ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit = can('accounting_edit');
  const direction = operationDirection(type);

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
  }, [
    account,
    amountValid,
    baseAmount,
    categoryInput,
    comment,
    markAsAdvance,
    paymentMethod,
    profile?.companyId,
    profile?.id,
    router,
    type,
  ]);

  const canSubmit = canEdit && amountValid && !submitting;

  const headerLeft = useCallback(
    () => <SheetNavButton label="Cancel" onPress={dismiss} />,
    [dismiss],
  );

  const headerRight = useCallback(
    () => (
      <SheetNavButton
        label="Add"
        emphasis
        disabled={!canSubmit}
        loading={submitting}
        onPress={() => void onSubmit()}
      />
    ),
    [canSubmit, onSubmit, submitting],
  );

  if (!canEdit) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          padding: tokens.space.section,
        }}
      >
        <Stack.Screen
          options={{
            title: 'New Operation',
            headerLeft,
            headerRight: () => null,
          }}
        />
        <Text variant="body" color="muted" style={{ textAlign: 'center' }}>
          You don't have permission to create operations
        </Text>
        <Button variant="outline" native={false} onPress={dismiss} style={{ marginTop: tokens.space.stack }}>
          Close
        </Button>
      </View>
    );
  }

  return (
    <KeyboardFormShell
      backgroundColor={colors.background}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingHorizontal: tokens.space.screenX,
        paddingTop: tokens.space.stack,
        paddingBottom: tokens.space.section,
        gap: tokens.space.stack + 2,
      }}
    >
      <Stack.Screen
        options={{
          title: 'New Operation',
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.foreground },
          headerStyle: { backgroundColor: colors.background },
          headerBlurEffect: isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight',
          headerLeft,
          headerRight,
        }}
      />

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

          <View style={{ gap: tokens.space.inline }}>
            <Text variant="caption1" color="muted" style={{ fontWeight: '600' }}>
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
