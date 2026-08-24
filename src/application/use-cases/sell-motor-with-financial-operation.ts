import { createSaleOperationUseCase } from "@/application/use-cases/create-sale-operation";
import { PaymentMethod, OperationAccount } from "@/domain/financial-operation";
import { isMotorAvailableForSale, MotorEntity } from "@/domain/motor";
import { MotorRepository } from "@/infrastructure/firestore/motor-repository";
import { FinancialOperationRepository } from "@/infrastructure/firestore/financial-operation-repository";
import { MOTOR_SALE_CATEGORY } from "@/lib/accounting/categories";

export async function sellMotorWithFinancialOperationUseCase(
  motorRepository: MotorRepository,
  financialRepository: FinancialOperationRepository,
  params: {
    uid: string;
    motor: MotorEntity;
    companyId: string;
    createdByUserId: string;
    amount: number;
    account: OperationAccount;
    paymentMethod: PaymentMethod;
    cashReceived?: number | null;
    comment?: string;
    relatedWarrantyId?: string | null;
    relatedClientId?: string | null;
  },
): Promise<string | null> {
  if (!isMotorAvailableForSale(params.motor)) {
    throw new Error("Engine intake must be verified before this motor can be sold");
  }

  const relatedMotorID = params.motor.localId ?? Number(params.motor.id);
  const soldDate = new Date();
  const arrivalDate = params.motor.arrivalDate ?? soldDate;

  const motorDescription = [params.motor.brandName, params.motor.engineCode, params.motor.serialCode]
    .filter(Boolean)
    .join(" ");

  await motorRepository.upsert(params.uid, params.motor.id, {
    companyId: params.companyId,
    localId: Number.isFinite(relatedMotorID) ? relatedMotorID : undefined,
    serialCode: params.motor.serialCode,
    configuration: params.motor.configuration,
    notes: params.motor.notes,
    quantity: params.motor.quantity,
    transmission: params.motor.transmission,
    arrivalDate,
    soldDate,
    brandName: params.motor.brandName,
    engineCode: params.motor.engineCode,
    engineId: params.motor.engineId,
    warrantyId: params.relatedWarrantyId ?? params.motor.warrantyId ?? undefined,
    status: "sold",
  });

  if (params.amount <= 0) {
    return null;
  }

  return createSaleOperationUseCase(financialRepository, {
    companyId: params.companyId,
    amount: params.amount,
    account: params.account,
    paymentMethod: params.paymentMethod,
    cashReceived: params.cashReceived ?? null,
    relatedMotorID: Number.isFinite(relatedMotorID) ? relatedMotorID : null,
    relatedMotorId: params.motor.id,
    relatedDonorId: params.motor.donorId ?? null,
    relatedWarrantyId: params.relatedWarrantyId ?? null,
    relatedClientId: params.relatedClientId ?? null,
    category: MOTOR_SALE_CATEGORY,
    description: motorDescription,
    comment: params.comment ?? "Продажа мотора",
    createdByUserId: params.createdByUserId,
  });
}
