import { createSaleOperationUseCase } from "@/application/use-cases/create-sale-operation";
import { PaymentMethod, OperationAccount } from "@/domain/financial-operation";
import { isUsedPartAvailableForSale, UsedPart } from "@/domain/used-part";
import { FinancialOperationRepository } from "@/infrastructure/firestore/financial-operation-repository";
import { UsedPartRepository } from "@/infrastructure/firestore/used-part-repository";
import { USED_PART_SALE_CATEGORY } from "@/lib/accounting/categories";

export { USED_PART_SALE_CATEGORY };

export async function sellUsedPartWithFinancialOperationUseCase(
  partRepository: UsedPartRepository,
  financialRepository: FinancialOperationRepository,
  params: {
    companyId: string;
    part: UsedPart;
    createdByUserId: string;
    amount: number;
    account: OperationAccount;
    paymentMethod: PaymentMethod;
    cashReceived?: number | null;
    comment?: string;
  },
): Promise<string | null> {
  if (!isUsedPartAvailableForSale(params.part)) {
    throw new Error("Part is not available for sale");
  }

  await partRepository.update(params.companyId, params.part.id, {
    status: "sold",
    soldAt: new Date(),
    soldAmount: params.amount,
  });

  if (params.amount <= 0) return null;

  return createSaleOperationUseCase(financialRepository, {
    companyId: params.companyId,
    amount: params.amount,
    account: params.account,
    paymentMethod: params.paymentMethod,
    cashReceived: params.cashReceived ?? null,
    relatedDonorId: params.part.donorId,
    relatedUsedPartId: params.part.id,
    category: USED_PART_SALE_CATEGORY,
    description: params.part.name,
    comment: params.comment ?? `Продажа б/у: ${params.part.name}`,
    createdByUserId: params.createdByUserId,
  });
}
