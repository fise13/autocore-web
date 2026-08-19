import { useState } from 'react';
import { View } from 'react-native';

import { CollectionRow, ListSection, Text } from '@/components/ui';
import { useAppDisplayCurrency, useSession } from '@/hooks';
import {
  APP_DISPLAY_CURRENCY_OPTIONS,
  type AppDisplayCurrency,
} from '@/lib/money/display-currency';
import { APP_MONEY_BASE_CURRENCY } from '@/lib/money/exchange-rates';
import { tokens } from '@/theme/tokens';

import { ProfileScreenShell } from '../components/profile-screen-shell';

export function CurrencyScreen() {
  const { profile } = useSession();
  const {
    currency,
    formatMoney,
    formatExample,
    exchangeRateHint,
    rates,
    setCurrency,
    isLoading,
  } = useAppDisplayCurrency();
  const canChange = profile?.isCompanyOwner === true;
  const [saving, setSaving] = useState<AppDisplayCurrency | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSelect(next: AppDisplayCurrency) {
    if (!canChange || next === currency || saving) return;
    setSaving(next);
    setError(null);
    try {
      await setCurrency(next);
    } catch {
      setError('Could not save currency');
    } finally {
      setSaving(null);
    }
  }

  const footerParts = [
    `Amounts are stored in ${APP_MONEY_BASE_CURRENCY}.`,
    exchangeRateHint,
    rates.source === 'fallback' && currency === 'KZT' ? 'Using a fallback rate until the live rate loads.' : null,
    canChange ? null : 'Only the company owner can change this.',
  ].filter(Boolean);

  return (
    <ProfileScreenShell title="Currency" subtitle="How money is shown in this workspace">
      <ListSection title="Display currency" footer={footerParts.join(' ')}>
        {APP_DISPLAY_CURRENCY_OPTIONS.map((option) => (
          <CollectionRow
            key={option.id}
            title={`${option.label} (${option.id})`}
            subtitle={option.description}
            selectable
            selected={currency === option.id}
            showChevron={false}
            disabled={!canChange || isLoading || saving !== null}
            onPress={() => void onSelect(option.id)}
            trailing={
              <Text variant="footnote" color="muted" style={{ fontVariant: ['tabular-nums'] }}>
                {formatExample(1_250, option.id)}
              </Text>
            }
          />
        ))}
      </ListSection>

      <ListSection title="Preview">
        <View style={{ padding: tokens.space.stack + 2, gap: tokens.space.inline }}>
          <Text variant="caption" color="muted">
            Example
          </Text>
          <Text variant="title" style={{ fontVariant: ['tabular-nums'] }}>
            {formatMoney(1_250)}
          </Text>
          {error ? (
            <Text variant="caption" color="destructive">
              {error}
            </Text>
          ) : null}
        </View>
      </ListSection>
    </ProfileScreenShell>
  );
}
