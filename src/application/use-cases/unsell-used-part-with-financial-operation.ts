import { createRefundOperationUseCase } from "@/application/use-cases/create-refund-operation";
import { PaymentMethod, OperationAccount } from "@/domain/financial-operation";
import { UsedPart } from "@/domain/used-part";
import { FinancialOperationRepository } from "@/infrastructure/firestore/financial-operation-repository";
import { MarketplaceListingRepository } from "@/infrastructure/firestore/marketplace-listing-repository";
import { UsedPartRepository } from "@/infrastructure/firestore/used-part-repository";

export async function unsellUsedPartWithFinancialOperationUseCase(
  partRepository: UsedPartRepository,
  financialRepository: FinancialOperationRepository,
  listingRepository: MarketplaceListingRepository,
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

  const restored = { ...params.part, status: "available" as const };
  await listingRepository.syncForPart(params.companyId, restored);

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
