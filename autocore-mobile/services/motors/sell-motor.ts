import { clientRepository } from '@/services/firestore/client-repository';
import { financialOperationRepository } from '@/services/firestore/financial-operation-repository';
import { motorRepository } from '@/services/firestore/motor-repository';
import { enqueueMotorSoldEffects } from '@/services/api/motors';
import type { ClientEntity } from '@/types/client';
import type { OperationAccount, PaymentMethod } from '@/types/financial-operation';
import type { MotorEntity } from '@/types/motor';

export type SellMotorInput = {
  uid: string;
  companyId: string;
  createdByUserId: string;
  motor: MotorEntity;
  amount: number;
  account: OperationAccount;
  paymentMethod: PaymentMethod;
  comment?: string;
  clientId?: string;
  clientName: string;
  clientPhone: string;
  clients?: ClientEntity[];
};

export type SellMotorResult = {
  motorId: string;
  operationId: string | null;
  clientId: string;
  warrantyId?: string | null;
};

/**
 * Standalone motor sale (web-parity): resolve/create client, mark motor sold,
 * create sale financial operation, best-effort warranty/docs via API.
 */
export async function sellMotor(input: SellMotorInput): Promise<SellMotorResult> {
  const clientName = input.clientName.trim();
  const clientPhone = input.clientPhone.trim();

  if (clientName.length < 2) {
    throw new Error('Enter the buyer\'s name');
  }
  if (clientPhone.length < 3) {
    throw new Error('Enter the buyer\'s phone number');
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Enter a valid amount');
  }

  const existing =
    (input.clientId
      ? input.clients?.find((entry) => entry.id === input.clientId)
      : undefined) ??
    input.clients?.find(
      (entry) =>
        entry.fullName.trim().toLowerCase() === clientName.toLowerCase() &&
        entry.phone.replace(/\D/g, '') === clientPhone.replace(/\D/g, ''),
    );

  const client =
    existing ??
    (await clientRepository.create({
      companyId: input.companyId,
      fullName: clientName,
      phone: clientPhone,
      createdByUserId: input.createdByUserId,
    }));

  const saleComment =
    input.comment?.trim() || `Sale · ${input.motor.serialCode} · ${client.fullName}`;

  const motorId = await motorRepository.sell(input.uid, {
    ...input.motor,
    companyId: input.companyId,
  });
  const relatedMotorID = input.motor.localId ?? Number(input.motor.id);
  const motorDescription = [input.motor.brandName, input.motor.engineCode, input.motor.serialCode]
    .filter(Boolean)
    .join(' ');

  let operationId: string | null = null;
  if (input.amount > 0) {
    operationId = await financialOperationRepository.create({
      companyId: input.companyId,
      createdByUserId: input.createdByUserId,
      type: 'sale',
      amount: input.amount,
      account: input.account,
      paymentMethod: input.paymentMethod,
      category: 'motor_sale',
      description: motorDescription,
      comment: saleComment,
      relatedMotorID: Number.isFinite(relatedMotorID) ? relatedMotorID : null,
      relatedMotorId: motorId,
      relatedClientId: client.id,
    });
  }

  let warrantyId: string | null | undefined;
  try {
    const effects = await enqueueMotorSoldEffects(motorId, {
      serialCode: input.motor.serialCode,
      engineCode: input.motor.engineCode,
      brandName: input.motor.brandName,
      configuration: input.motor.configuration,
      localId: input.motor.localId,
      amount: input.amount,
      account: input.account,
      paymentMethod: input.paymentMethod,
      comment: saleComment,
      clientId: client.id,
      clientName: client.fullName,
      clientPhone: client.phone,
    });
    warrantyId = effects.warrantyId;
    if (!effects.ok && effects.error) {
      console.warn('[motor-sell] sold-effects:', effects.error);
    }
  } catch (error) {
    console.warn('[motor-sell] sold-effects:', error);
  }

  return { motorId, operationId, clientId: client.id, warrantyId };
}
