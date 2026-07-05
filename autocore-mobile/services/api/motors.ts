import { mobileApi } from '@/services/api/endpoints';
import { mobileGet, mobilePostFlexible } from '@/services/api/mobile-client';
import type { OperationAccount, PaymentMethod } from '@/types/financial-operation';

export type MotorSoldEffectsPayload = {
  serialCode: string;
  engineCode?: string;
  brandName?: string;
  configuration?: string;
  localId?: number;
  amount: number;
  account: OperationAccount;
  paymentMethod: PaymentMethod;
  comment?: string;
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
};

export type MotorSoldEffectsResult = {
  ok: boolean;
  warrantyId?: string | null;
  error?: string;
};

export async function fetchMotorWarrantyId(motorId: string): Promise<string | null> {
  try {
    const data = await mobileGet<{ warrantyId?: string | null }>(mobileApi.motorDocuments(motorId));
    return data.warrantyId ?? null;
  } catch {
    return null;
  }
}

/** Best-effort warranty / PDF jobs after a standalone motor sale (web-parity). */
export async function enqueueMotorSoldEffects(
  motorId: string,
  payload: MotorSoldEffectsPayload,
): Promise<MotorSoldEffectsResult> {
  try {
    const { ok, status, data } = await mobilePostFlexible<{
      error?: string;
      warrantyId?: string | null;
    }>(mobileApi.motorSoldEffects(motorId), payload);

    if (!ok) {
      return {
        ok: false,
        error: data?.error ?? `Не удалось оформить документы продажи (${status})`,
      };
    }

    return { ok: true, warrantyId: data?.warrantyId ?? null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Не удалось оформить документы продажи',
    };
  }
}
