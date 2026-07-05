import { useCallback, useMemo } from 'react';

import {
  formatAppMoney,
  formatAppMoneyExample,
  type AppDisplayCurrency,
} from '@/lib/money/display-currency';
import {
  APP_MONEY_BASE_CURRENCY,
  convertFromBaseCurrency,
  formatExchangeRateHint,
} from '@/lib/money/exchange-rates';
import { useSession } from '@/hooks/use-session';

import { useExchangeRates } from './use-exchange-rates';
import { useUserDisplayCurrency } from './use-user-display-currency';

export function useAppDisplayCurrency() {
  const { uid } = useSession();
  const { currency, isLoading: preferencesLoading, saveCurrency } = useUserDisplayCurrency(uid);
  const { rates, isLoading: ratesLoading } = useExchangeRates();

  const convertMoney = useCallback(
    (valueInBase: number) => convertFromBaseCurrency(valueInBase, currency, rates),
    [currency, rates],
  );

  const formatMoney = useCallback(
    (valueInBase: number) => formatAppMoney(convertMoney(valueInBase), currency),
    [convertMoney, currency],
  );

  const formatExample = useCallback(
    (amountInBase: number, target: AppDisplayCurrency = currency) =>
      formatAppMoneyExample(amountInBase, target, (value) =>
        convertFromBaseCurrency(value, target, rates),
      ),
    [currency, rates],
  );

  const exchangeRateHint = useMemo(() => formatExchangeRateHint(currency, rates), [currency, rates]);

  const setCurrency = useCallback(
    async (next: AppDisplayCurrency) => {
      await saveCurrency(next);
    },
    [saveCurrency],
  );

  return {
    baseCurrency: APP_MONEY_BASE_CURRENCY,
    currency,
    rates,
    convertMoney,
    formatMoney,
    formatExample,
    exchangeRateHint,
    setCurrency,
    isLoading: preferencesLoading || ratesLoading,
  };
}
