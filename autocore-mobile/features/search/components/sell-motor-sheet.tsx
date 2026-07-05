import {
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AutocompleteInput, Button, Dropdown, Input, Text } from '@/components/ui';
import { useClientsRealtime, useModalBottomSheet, useTheme } from '@/hooks';
import { accountOptions, paymentMethodOptions } from '@/lib/accounting/labels';
import type { AutocompleteOption } from '@/lib/autocomplete/types';
import { sellMotor } from '@/services/motors/sell-motor';
import { haptics, rhythm } from '@/theme';
import type { OperationAccount, PaymentMethod } from '@/types/financial-operation';
import type { MotorEntity } from '@/types/motor';

export type SellMotorSheetRef = {
  present: (motor: MotorEntity) => void;
  dismiss: () => void;
};

type SellMotorSheetProps = {
  companyId: string;
  uid: string;
  userId: string;
  onSold?: (motor: MotorEntity) => void;
};

function parseAmountInput(value: string): number {
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  return Number(normalized);
}

function motorHeadline(motor: MotorEntity): string {
  return [motor.brandName, motor.engineCode].filter(Boolean).join(' · ') || motor.serialCode;
}

export const SellMotorSheet = forwardRef<SellMotorSheetRef, SellMotorSheetProps>(
  function SellMotorSheet({ companyId, uid, userId, onSold }, ref) {
    const { colors } = useTheme();
    const sheet = useModalBottomSheet();
    const sheetRef = useRef<BottomSheetModal>(null);

    const { clients } = useClientsRealtime(companyId);

    const [motor, setMotor] = useState<MotorEntity | null>(null);
    const [amount, setAmount] = useState('');
    const [account, setAccount] = useState<OperationAccount>('cashbox');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [clientId, setClientId] = useState<string | undefined>();
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const clientNameOptions = useMemo<AutocompleteOption[]>(
      () =>
        clients.map((client) => ({
          value: client.fullName,
          label: client.phone,
        })),
      [clients],
    );

    const clientPhoneOptions = useMemo<AutocompleteOption[]>(
      () =>
        clients.map((client) => ({
          value: client.phone,
          label: client.fullName,
        })),
      [clients],
    );

    const resetForm = useCallback((nextMotor: MotorEntity) => {
      setMotor(nextMotor);
      setAmount('');
      setAccount('cashbox');
      setPaymentMethod('cash');
      setClientId(undefined);
      setClientName('');
      setClientPhone('');
      setComment(`Продажа · ${nextMotor.serialCode}`);
      setError(null);
      setSubmitting(false);
    }, []);

    useImperativeHandle(ref, () => ({
      present: (nextMotor) => {
        resetForm(nextMotor);
        sheetRef.current?.present();
      },
      dismiss: () => sheetRef.current?.dismiss(),
    }));

    const renderBackdrop = sheet.renderBackdrop;

    const selectClientByName = (name: string) => {
      const client = clients.find((entry) => entry.fullName === name);
      if (!client) {
        setClientId(undefined);
        return;
      }
      setClientId(client.id);
      setClientName(client.fullName);
      setClientPhone(client.phone);
    };

    const selectClientByPhone = (phone: string) => {
      const client = clients.find((entry) => entry.phone === phone);
      if (!client) {
        setClientId(undefined);
        return;
      }
      setClientId(client.id);
      setClientName(client.fullName);
      setClientPhone(client.phone);
    };

    async function onSubmit() {
      if (!motor) return;

      const parsedAmount = parseAmountInput(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        setError('Введите корректную сумму');
        return;
      }
      if (clientName.trim().length < 2) {
        setError('Укажите имя покупателя');
        return;
      }
      if (clientPhone.trim().length < 3) {
        setError('Укажите телефон покупателя');
        return;
      }

      setSubmitting(true);
      setError(null);
      haptics.light();

      try {
        await sellMotor({
          uid,
          companyId,
          createdByUserId: userId,
          motor,
          amount: parsedAmount,
          account,
          paymentMethod,
          comment,
          clientId,
          clientName,
          clientPhone,
          clients,
        });
        haptics.success();
        onSold?.(motor);
        sheetRef.current?.dismiss();
      } catch (nextError) {
        haptics.warning();
        setError(nextError instanceof Error ? nextError.message : 'Не удалось продать мотор');
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
              Продажа мотора
            </Text>
            {motor ? (
              <Text variant="caption" color="muted" style={{ fontSize: 13, lineHeight: 18 }}>
                {motor.serialCode}
                {motorHeadline(motor) !== motor.serialCode ? ` · ${motorHeadline(motor)}` : ''}
              </Text>
            ) : null}
          </View>

          <View style={{ gap: 6 }}>
            <Text variant="caption" color="muted">
              Сумма
            </Text>
            <Input
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              autoFocus
            />
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
              Покупатель
            </Text>
            <AutocompleteInput
              value={clientName}
              onValueChange={(value) => {
                setClientName(value);
                setClientId(undefined);
              }}
              onOptionSelect={selectClientByName}
              options={clientNameOptions}
              placeholder="Имя"
              matchMode="flexible"
            />
          </View>

          <View style={{ gap: 6 }}>
            <Text variant="caption" color="muted">
              Телефон
            </Text>
            <AutocompleteInput
              value={clientPhone}
              onValueChange={(value) => {
                setClientPhone(value);
                setClientId(undefined);
              }}
              onOptionSelect={selectClientByPhone}
              options={clientPhoneOptions}
              placeholder="+7…"
              keyboardType="phone-pad"
              matchMode="flexible"
            />
          </View>

          {clients.length > 0 ? (
            <View style={{ gap: 8 }}>
              <Text variant="caption" color="muted">
                Недавние клиенты
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {clients.slice(0, 4).map((client) => {
                  const selected = clientId === client.id;
                  return (
                    <Pressable
                      key={client.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => {
                        haptics.selection();
                        setClientId(client.id);
                        setClientName(client.fullName);
                        setClientPhone(client.phone);
                      }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 999,
                        borderWidth: rhythm.hairline,
                        borderColor: selected ? colors.primary : colors.borderMuted,
                        backgroundColor: selected ? colors.sidebarAccent : colors.secondary,
                      }}
                    >
                      <Text
                        variant="caption"
                        numberOfLines={1}
                        style={{
                          fontWeight: '500',
                          color: selected ? colors.primary : colors.foreground,
                          maxWidth: 140,
                        }}
                      >
                        {client.fullName}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={{ gap: 6 }}>
            <Text variant="caption" color="muted">
              Комментарий
            </Text>
            <Input
              value={comment}
              onChangeText={setComment}
              placeholder="Комментарий к продаже"
              multiline
              rows={3}
            />
          </View>

          {error ? (
            <Text variant="caption" color="destructive">
              {error}
            </Text>
          ) : null}

          <Button loading={submitting} disabled={submitting || !motor} onPress={() => void onSubmit()}>
            Продать
          </Button>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);
