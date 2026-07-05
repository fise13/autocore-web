import { useQuery } from '@tanstack/react-query';

import { FALLBACK_EXCHANGE_RATES, type ExchangeRates } from '@/lib/money/exchange-rates';
import { getPublicApiBaseUrl } from '@/services/api/api-base-url';

async function fetchExchangeRates(): Promise<ExchangeRates> {
  const response = await fetch(`${getPublicApiBaseUrl()}/api/money/exchange-rates`, {
    cache: 'no-store',
  });
  if (!response.ok) return FALLBACK_EXCHANGE_RATES;
  const payload = (await response.json()) as ExchangeRates;
  if (!payload?.kztPerUsd || !payload?.rubPerUsd) return FALLBACK_EXCHANGE_RATES;
  return payload;
}

export function useExchangeRates() {
  const query = useQuery({
    queryKey: ['api', 'money', 'exchange-rates'],
    queryFn: fetchExchangeRates,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    retry: 1,
  });

  return {
    rates: query.data ?? FALLBACK_EXCHANGE_RATES,
    isLoading: query.isLoading,
  };
}
