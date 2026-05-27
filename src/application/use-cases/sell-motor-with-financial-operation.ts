import { createSaleOperationUseCase } from "@/application/use-cases/create-sale-operation";
import { PaymentMethod, OperationAccount } from "@/domain/financial-operation";
import { MotorEntity } from "@/domain/motor";
import { MotorRepository } from "@/infrastructure/firestore/motor-repository";
import { FinancialOperationRepository } from "@/infrastructure/firestore/financial-operation-repository";

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
    comment?: string;
  },
) {
  const relatedMotorID = params.motor.localId ?? Number(params.motor.id);
  const soldDate = new Date();

  await motorRepository.upsert(params.uid, params.motor.id, {
    companyId: params.companyId,
    localId: Number.isFinite(relatedMotorID) ? relatedMotorID : undefined,
    serialCode: params.motor.serialCode,
    configuration: params.motor.configuration,
    notes: params.motor.notes,
    quantity: params.motor.quantity,
    transmission: params.motor.transmission,
    arrivalDate: params.motor.arrivalDate,
    soldDate,
    brandName: params.motor.brandName,
    engineCode: params.motor.engineCode,
    engineId: params.motor.engineId,
  });

  await createSaleOperationUseCase(financialRepository, {
    companyId: params.companyId,
    amount: params.amount,
    account: params.account,
    paymentMethod: params.paymentMethod,
    relatedMotorID: Number.isFinite(relatedMotorID) ? relatedMotorID : null,
    comment: params.comment ?? "Продажа мотора (web)",
    createdByUserId: params.createdByUserId,
  });
}
