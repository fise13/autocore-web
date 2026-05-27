import { createSaleOperationUseCase } from "@/application/use-cases/create-sale-operation";
import { PaymentMethod, OperationAccount } from "@/domain/financial-operation";
import { formatMotorDate } from "@/lib/motor-dates";
import {
  applySpecificSlotValue,
  buildSpecificRowPayload,
  SpecificHeaderMapping,
} from "@/lib/specific/specific-header-mapping";
import { specificRecordLabel } from "@/lib/specific/specific-record-label";
import {
  SpecificCategoryEntity,
  SpecificCategoryRepository,
  SpecificRecordEntity,
} from "@/infrastructure/firestore/specific-category-repository";
import { FinancialOperationRepository } from "@/infrastructure/firestore/financial-operation-repository";

export async function sellSpecificWithFinancialOperationUseCase(
  specificRepository: SpecificCategoryRepository,
  financialRepository: FinancialOperationRepository,
  params: {
    companyId: string;
    category: SpecificCategoryEntity;
    record: SpecificRecordEntity;
    headerMapping: SpecificHeaderMapping;
    createdByUserId: string;
    amount: number;
    account: OperationAccount;
    paymentMethod: PaymentMethod;
    comment?: string;
  },
) {
  const label = specificRecordLabel(params.record, params.headerMapping);
  const nextData = applySpecificSlotValue(
    params.record.data,
    params.headerMapping,
    6,
    formatMotorDate(new Date()),
  );

  await specificRepository.upsertRecord(
    params.companyId,
    params.category,
    params.record.rowIndex,
    buildSpecificRowPayload(nextData, params.headerMapping),
    params.createdByUserId,
  );

  await createSaleOperationUseCase(financialRepository, {
    companyId: params.companyId,
    amount: params.amount,
    account: params.account,
    paymentMethod: params.paymentMethod,
    relatedMotorID: null,
    category: params.category.name,
    details: label,
    comment: params.comment ?? `Продажа: ${params.category.name} — ${label}`,
    createdByUserId: params.createdByUserId,
  });
}
