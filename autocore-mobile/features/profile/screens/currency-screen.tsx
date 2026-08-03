import { View } from 'react-native';

import { ListSection, Text } from '@/components/ui';
import { useAppDisplayCurrency } from '@/hooks/use-app-display-currency';
import { tokens } from '@/theme/tokens';
import { APP_MONEY_BASE_CURRENCY } from '@/lib/money/exchange-rates';

import { ProfileScreenShell } from '../components/profile-screen-shell';

/** Display currency is locked to USD. */
export function CurrencyScreen() {
  const { formatMoney } = useAppDisplayCurrency();

  return (
    <ProfileScreenShell
      title="Currency"
      subtitle="All amounts are shown in US dollars"
    >
      <ListSection
        title="Display currency"
        footer={`Base accounting currency is ${APP_MONEY_BASE_CURRENCY}.`}
      >
        <View style={{ padding: tokens.space.stack + 2, gap: tokens.space.inline }}>
          <Text variant="body" style={{ fontWeight: '600' }}>
            Dollars (USD)
          </Text>
          <Text variant="caption" color="muted">
            United States · $
          </Text>
        </View>
      </ListSection>

      <ListSection title="Preview">
        <View style={{ padding: tokens.space.stack + 2, gap: tokens.space.inline }}>
          <Text variant="caption" color="muted">
            Example
          </Text>
          <Text variant="title" style={{ fontVariant: ['tabular-nums'] }}>
            {formatMoney(1_250)}
          </Text>
        </View>
      </ListSection>
    </ProfileScreenShell>
  );
}
