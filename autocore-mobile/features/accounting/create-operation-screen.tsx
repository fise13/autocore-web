import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Keyboard, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowLeftIcon } from '@/assets/icons';
import { ScreenActionFooter } from '@/components/navigation/screen-action-footer';
import { Button, AutocompleteInput, Checkbox, Dropdown, IconButton, Input, KeyboardFormShell, Text, toast } from '@/components/ui';
import { useFloatingTabBarInset, useSession, useTheme } from '@/hooks';
import { appendAdvanceMarker } from '@/lib/accounting/advances';
import {
  ACCOUNTING_CATEGORY_SUGGESTIONS,
  accountOptions,
  creatableTypeOptions,
  operationCategoryLabel,
  paymentMethodOptions,
  resolveOperationCategoryValue,
} from '@/lib/accounting/labels';
import { createFinancialOperation } from '@/services/accounting/create-financial-operation';
import { haptics } from '@/theme';
import type { CreatableOperationType } from '@/lib/accounting/labels';
import type { OperationAccount, PaymentMethod } from '@/types/financial-operation';

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

export function CreateOperationScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { scrollBottom } = useFloatingTabBarInset();
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

  async function onSubmit() {
    if (!profile?.id || !profile.companyId) return;

    const parsedAmount = parseAmountInput(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Введите корректную сумму');
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
        amount: parsedAmount,
        account,
        paymentMethod,
        category: normalized.category || null,
        comment: normalized.comment || null,
      });

      haptics.success();
      toast({ title: 'Операция сохранена', variant: 'success' });
      router.back();
    } catch (nextError) {
      haptics.warning();
      setError(nextError instanceof Error ? nextError.message : 'Не удалось создать операцию');
    } finally {
      setSubmitting(false);
    }
  }

  if (!canEdit) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text variant="body" color="muted" style={{ textAlign: 'center' }}>
          Нет прав на создание операций
        </Text>
        <Button variant="outline" onPress={() => router.back()} style={{ marginTop: 16 }}>
          Назад
        </Button>
      </View>
    );
  }

  return (
    <KeyboardFormShell
      backgroundColor={colors.background}
      onScrollBeginDrag={Keyboard.dismiss}
      contentContainerStyle={{
        paddingHorizontal: ac.pad,
        paddingTop: 16,
        paddingBottom: scrollBottom,
        gap: 14,
      }}
      header={
        <View
          style={{
            paddingTop: insets.top + 6,
            paddingHorizontal: ac.pad,
            paddingBottom: 12,
            gap: 4,
            borderBottomWidth: ac.hairline,
            borderBottomColor: colors.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <IconButton accessibilityLabel="Назад" variant="ghost" size="sm" onPress={() => router.back()}>
              <ArrowLeftIcon size="sm" color={colors.foreground} strokeWidth={2} />
            </IconButton>
            <View style={{ flex: 1 }}>
              <Text variant="caption" color="muted" style={{ fontSize: 11 }}>
                Финансы
              </Text>
              <Text variant="heading" style={{ fontSize: 20, fontWeight: '700', letterSpacing: -0.3 }}>
                Новая операция
              </Text>
            </View>
          </View>
        </View>
      }
      footer={
        <ScreenActionFooter horizontalPadding={ac.pad}>
          <Button loading={submitting} disabled={submitting} onPress={() => void onSubmit()} style={{ flex: 1 }}>
            Сохранить
          </Button>
        </ScreenActionFooter>
      }
    >
        <Text variant="caption" color="muted" style={{ fontSize: 13 }}>
          Добавьте финансовую операцию в журнал компании.
        </Text>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text variant="caption" color="muted">
              Тип
            </Text>
            <Dropdown
              value={type}
              onValueChange={(value) => setType(value as CreatableOperationType)}
              options={creatableTypeOptions()}
            />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text variant="caption" color="muted">
              Сумма
            </Text>
            <Input value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text variant="caption" color="muted">
              Счёт
            </Text>
            <Dropdown
              value={account}
              onValueChange={(value) => setAccount(value as OperationAccount)}
              options={accountOptions()}
            />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text variant="caption" color="muted">
              Оплата
            </Text>
            <Dropdown
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
              options={paymentMethodOptions()}
            />
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <Text variant="caption" color="muted">
            Категория
          </Text>
          <AutocompleteInput
            source="category"
            value={categoryInput}
            onValueChange={setCategoryInput}
            placeholder="Например: зарплата"
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {ACCOUNTING_CATEGORY_SUGGESTIONS.slice(0, 6).map((item) => (
              <Button
                key={item}
                size="sm"
                variant="outline"
                onPress={() => setCategoryInput(operationCategoryLabel(item))}
              >
                {operationCategoryLabel(item)}
              </Button>
            ))}
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <Text variant="caption" color="muted">
            Комментарий
          </Text>
          <Input
            value={comment}
            onChangeText={setComment}
            placeholder="Комментарий к операции"
            multiline
            rows={3}
          />
        </View>

        <Checkbox checked={markAsAdvance} onCheckedChange={setMarkAsAdvance} label="Пометить как аванс" />

        {error ? (
          <Text variant="caption" color="destructive">
            {error}
          </Text>
        ) : null}
    </KeyboardFormShell>
  );
}
