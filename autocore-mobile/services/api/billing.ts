import { mobilePost } from '@/services/api/mobile-client';

export type BillingInterval = 'monthly' | 'yearly';

export async function startCompanyTrial(companyId: string): Promise<{ proActive: boolean; started: boolean }> {
  return mobilePost('/api/billing/start-trial', { companyId });
}

export async function activateCompanyPro(
  companyId: string,
  interval: BillingInterval = 'monthly',
): Promise<{ proActive: boolean }> {
  return mobilePost('/api/billing/activate-pro', { companyId, interval });
}

export async function refreshCompanyBilling(
  companyId: string,
): Promise<{ proActive: boolean; expired?: 'trial' | 'pro' }> {
  return mobilePost('/api/billing/refresh', { companyId });
}
