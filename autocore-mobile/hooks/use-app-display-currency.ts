import { useCallback, useMemo } from 'react';

import {
  formatAppMoney,
  formatAppMoneyExample,
  type AppDisplayCurrency,
} from '@/lib/money/display-currency';
import {
  APP_MONEY_BASE_CURRENCY,
  convertFromBaseCurrency,
  convertToBaseCurrency,
  formatExchangeRateHint,
} from '@/lib/money/exchange-rates';
import { useSession } from '@/hooks/use-session';

import { useCompanyDisplayCurrency } from './use-company-display-currency';
import { useExchangeRates } from './use-exchange-rates';

export function useAppDisplayCurrency() {
  const { uid, companyId } = useSession();
  const { currency, isLoading: preferencesLoading, saveCurrency } = useCompanyDisplayCurrency(
    companyId || null,
  );
  const { rates, isLoading: ratesLoading } = useExchangeRates();

  const convertMoney = useCallback(
    (valueInBase: number) => convertFromBaseCurrency(valueInBase, currency, rates),
    [currency, rates],
  );

  const formatMoney = useCallback(
    (valueInBase: number) => formatAppMoney(convertMoney(valueInBase), currency),
    [convertMoney, currency],
  );

  const toBaseAmount = useCallback(
    (displayAmount: number) => convertToBaseCurrency(displayAmount, currency, rates),
    [currency, rates],
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
      if (!uid) throw new Error('User is not authenticated');
      await saveCurrency(next, uid);
    },
    [saveCurrency, uid],
  );

  return {
    baseCurrency: APP_MONEY_BASE_CURRENCY,
    currency,
    rates,
    convertMoney,
    toBaseAmount,
    formatMoney,
    formatExample,
    exchangeRateHint,
    setCurrency,
    isLoading: preferencesLoading || ratesLoading,
  };
}
