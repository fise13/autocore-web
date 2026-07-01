import { MotorEntity } from "@/domain/motor";
import { PaymentMethod, OperationAccount } from "@/domain/financial-operation";
import type { MotorSaleWarrantyOverride } from "@/lib/documents/warranty/custom-warranty";
import { getFirebaseAuth } from "@/infrastructure/firebase/client";

/** Creates warranty + PDF jobs on the server (best-effort; sale already saved client-side). */
export async function enqueueMotorSoldEffects(
  motor: MotorEntity,
  payload: {
    amount: number;
    account: OperationAccount;
    paymentMethod: PaymentMethod;
    comment?: string;
    clientId?: string;
    clientName?: string;
    clientPhone?: string;
    warrantyOverride?: MotorSaleWarrantyOverride;
  },
): Promise<{ ok: boolean; error?: string }> {
  try {
    const auth = getFirebaseAuth();
    const token = await auth.currentUser?.getIdToken();
    if (!token) return { ok: false, error: "Требуется авторизация" };

    const response = await fetch(`/api/motors/${encodeURIComponent(motor.id)}/sold-effects`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        serialCode: motor.serialCode,
        engineCode: motor.engineCode,
        brandName: motor.brandName,
        configuration: motor.configuration,
        localId: motor.localId,
        amount: payload.amount,
        account: payload.account,
        paymentMethod: payload.paymentMethod,
        comment: payload.comment,
        clientId: payload.clientId,
        clientName: payload.clientName,
        clientPhone: payload.clientPhone,
        warrantyOverride: payload.warrantyOverride,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      return { ok: false, error: data.error ?? "Не удалось оформить документы продажи" };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Не удалось оформить документы продажи",
    };
  }
}
