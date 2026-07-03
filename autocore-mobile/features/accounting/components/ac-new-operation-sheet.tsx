import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Checkbox, Dropdown, Input, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
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

import { ac } from '../layout';

export type AcNewOperationSheetRef = {
  present: (defaultType?: CreatableOperationType) => void;
  dismiss: () => void;
};

type AcNewOperationSheetProps = {
  companyId: string;
  userId: string;
  disabled?: boolean;
  onCreated?: () => void;
};

function parseAmountInput(value: string): number {
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  return Number(normalized);
}

export const AcNewOperationSheet = forwardRef<AcNewOperationSheetRef, AcNewOperationSheetProps>(
  function AcNewOperationSheet({ companyId, userId, disabled = false, onCreated }, ref) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const sheetRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['88%'], []);

    const [type, setType] = useState<CreatableOperationType>('expense');
    const [amount, setAmount] = useState('');
    const [account, setAccount] = useState<OperationAccount>('cashbox');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [categoryInput, setCategoryInput] = useState('');
    const [comment, setComment] = useState('');
    const [markAsAdvance, setMarkAsAdvance] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const resetForm = useCallback((defaultType: CreatableOperationType = 'expense') => {
      setType(defaultType);
      setAmount('');
      setAccount('cashbox');
      setPaymentMethod('cash');
      setCategoryInput('');
      setComment('');
      setMarkAsAdvance(false);
      setError(null);
    }, []);

    useImperativeHandle(ref, () => ({
      present: (defaultType = 'expense') => {
        if (disabled) return;
        resetForm(defaultType);
        sheetRef.current?.present();
      },
      dismiss: () => sheetRef.current?.dismiss(),
    }));

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
      ),
      [],
    );

    async function onSubmit() {
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

        await createFinancialOperation(companyId, userId, {
          type,
          amount: parsedAmount,
          account,
          paymentMethod,
          category: normalized.category || null,
          comment: normalized.comment || null,
        });

        haptics.success();
        sheetRef.current?.dismiss();
        onCreated?.();
      } catch (nextError) {
        haptics.warning();
        setError(nextError instanceof Error ? nextError.message : 'Не удалось создать операцию');
      } finally {
        setSubmitting(false);
      }
    }

    return (
      <BottomSheetModal
        ref={sheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.card }}
        handleIndicatorStyle={{ backgroundColor: colors.mutedForeground, width: 40 }}
      >
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: ac.pad,
            paddingBottom: Math.max(insets.bottom, 16) + 12,
            gap: 14,
          }}
        >
          <View style={{ gap: 4 }}>
            <Text variant="heading" style={{ fontSize: 20, fontWeight: '700' }}>
              Новая операция
            </Text>
            <Text variant="caption" color="muted" style={{ fontSize: 13 }}>
              Добавьте финансовую операцию в журнал компании.
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text variant="caption" color="muted">
                Тип
              </Text>
              <Dropdown value={type} onValueChange={(value) => setType(value as CreatableOperationType)} options={creatableTypeOptions()} />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text variant="caption" color="muted">
                Сумма
              </Text>
              <Input
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text variant="caption" color="muted">
                Счёт
              </Text>
              <Dropdown value={account} onValueChange={(value) => setAccount(value as OperationAccount)} options={accountOptions()} />
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
            <Input
              value={categoryInput}
              onChangeText={setCategoryInput}
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
              style={{ minHeight: 72, textAlignVertical: 'top' }}
            />
          </View>

          <Checkbox
            checked={markAsAdvance}
            onCheckedChange={setMarkAsAdvance}
            label="Пометить как аванс"
          />

          {error ? (
            <Text variant="caption" color="destructive">
              {error}
            </Text>
          ) : null}

          <Button loading={submitting} disabled={disabled || submitting} onPress={() => void onSubmit()}>
            Сохранить
          </Button>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);
