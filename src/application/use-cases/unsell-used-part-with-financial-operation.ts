import { createRefundOperationUseCase } from "@/application/use-cases/create-refund-operation";
import { PaymentMethod, OperationAccount } from "@/domain/financial-operation";
import { UsedPart } from "@/domain/used-part";
import { FinancialOperationRepository } from "@/infrastructure/firestore/financial-operation-repository";
import { UsedPartRepository } from "@/infrastructure/firestore/used-part-repository";

export async function unsellUsedPartWithFinancialOperationUseCase(
  partRepository: UsedPartRepository,
  financialRepository: FinancialOperationRepository,
  params: {
    companyId: string;
    part: UsedPart;
    createdByUserId: string;
    amount: number;
    account: OperationAccount;
    paymentMethod: PaymentMethod;
    comment?: string;
  },
) {
  await partRepository.update(params.companyId, params.part.id, {
    status: "available",
    soldAt: null,
    soldAmount: null,
  });

  if (params.amount <= 0) return;

  await createRefundOperationUseCase(financialRepository, {
    companyId: params.companyId,
    amount: params.amount,
    account: params.account,
    paymentMethod: params.paymentMethod,
    relatedDonorId: params.part.donorId,
    relatedUsedPartId: params.part.id,
    comment: params.comment ?? `Возврат б/у: ${params.part.name}`,
    createdByUserId: params.createdByUserId,
  });
}
