import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { CheckIcon } from '@/assets/icons';
import { SettingsSectionCard, Text } from '@/components/ui';
import { useAppDisplayCurrency } from '@/hooks/use-app-display-currency';
import { useTheme } from '@/hooks/use-theme';
import { haptics, rhythm } from '@/theme';
import { toneBackground } from '@/theme/color-utils';
import {
  APP_DISPLAY_CURRENCY_OPTIONS,
  appDisplayCurrencyOption,
  type AppDisplayCurrency,
} from '@/lib/money/display-currency';
import { APP_MONEY_BASE_CURRENCY } from '@/lib/money/exchange-rates';

import { ProfileScreenShell } from '../components/profile-screen-shell';

const EXAMPLE_BASE_AMOUNT = 100_000;

export function CurrencyScreen() {
  const { colors } = useTheme();
  const {
    currency,
    formatMoney,
    formatExample,
    exchangeRateHint,
    rates,
    setCurrency,
    isLoading,
  } = useAppDisplayCurrency();
  const [saving, setSaving] = useState<AppDisplayCurrency | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const activeOption = appDisplayCurrencyOption(currency);

  async function onSelect(next: AppDisplayCurrency) {
    if (next === currency || saving) return;
    setSaving(next);
    setStatus(null);
    haptics.light();
    try {
      await setCurrency(next);
      setStatus('Валюта отображения сохранена');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Не удалось сохранить валюту');
    } finally {
      setSaving(null);
    }
  }

  return (
    <ProfileScreenShell
      title="Валюта"
      subtitle="Суммы хранятся в тенге и пересчитываются при показе"
    >
      <SettingsSectionCard>
        <View style={styles.hint}>
          <Text variant="caption" color="muted" style={styles.hintText}>
            Настройка синхронизируется с веб-версией AutoCore. Базовая валюта учёта —{' '}
            {APP_MONEY_BASE_CURRENCY}.
          </Text>
          {isLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text variant="caption" color="muted">
                Загрузка курсов…
              </Text>
            </View>
          ) : null}
        </View>

        {APP_DISPLAY_CURRENCY_OPTIONS.map((option) => {
          const active = currency === option.id;
          const pending = saving === option.id;
          const example = formatExample(EXAMPLE_BASE_AMOUNT, option.id);

          return (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              disabled={Boolean(saving) || isLoading}
              onPress={() => void onSelect(option.id)}
            >
              {({ pressed }) => (
                <View
                  style={[
                    styles.row,
                    {
                      borderTopColor: colors.border,
                      backgroundColor: pressed ? colors.muted : 'transparent',
                    },
                    active && {
                      backgroundColor: toneBackground(colors.primary, 0.08),
                    },
                  ]}
                >
                  <View style={styles.rowBody}>
                    <Text variant="body" style={styles.rowTitle}>
                      {option.label}
                    </Text>
                    <Text variant="caption" color="muted">
                      {option.description}
                    </Text>
                    <Text variant="body" style={styles.example}>
                      {example}
                    </Text>
                    {option.id !== 'KZT' ? (
                      <Text variant="caption" color="muted">
                        из {EXAMPLE_BASE_AMOUNT.toLocaleString('ru-RU')} ₸
                      </Text>
                    ) : null}
                  </View>
                  {pending ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : active ? (
                    <View style={[styles.check, { backgroundColor: colors.primary }]}>
                      <CheckIcon size={12} color={colors.primaryForeground} strokeWidth={2.5} />
                    </View>
                  ) : null}
                </View>
              )}
            </Pressable>
          );
        })}
      </SettingsSectionCard>

      <SettingsSectionCard>
        <View style={styles.preview}>
          <Text variant="caption" color="muted">
            Пример с текущей настройкой
          </Text>
          <Text variant="title" style={styles.previewValue}>
            {formatMoney(1_250_000)}
          </Text>
          {exchangeRateHint ? (
            <Text variant="caption" color="muted">
              Курс: {exchangeRateHint}
            </Text>
          ) : null}
          {rates.source === 'fallback' ? (
            <Text variant="caption" color="muted">
              Используется резервный курс — обновление с сервера недоступно.
            </Text>
          ) : null}
          {status ? (
            <Text variant="caption" style={{ color: colors.primary }}>
              {status}
            </Text>
          ) : null}
          <Text variant="caption" color="muted">
            Сейчас: {activeOption.label} ({activeOption.id})
          </Text>
        </View>
      </SettingsSectionCard>
    </ProfileScreenShell>
  );
}

const styles = StyleSheet.create({
  hint: {
    paddingHorizontal: rhythm.cardPadX,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  hintText: {
    lineHeight: 18,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rhythm.stack,
    paddingHorizontal: rhythm.cardPadX,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  example: {
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    paddingHorizontal: rhythm.cardPadX,
    paddingVertical: 14,
    gap: 6,
  },
  previewValue: {
    fontVariant: ['tabular-nums'],
  },
});
