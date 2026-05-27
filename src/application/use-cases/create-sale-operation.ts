import { CreateFinancialOperationInput } from "@/domain/financial-operation";
import { FinancialOperationRepository } from "@/infrastructure/firestore/financial-operation-repository";

import { createOperationUseCase } from "./create-operation";

export async function createSaleOperationUseCase(
  repository: FinancialOperationRepository,
  payload: Omit<CreateFinancialOperationInput, "type">,
) {
  return createOperationUseCase(repository, {
    ...payload,
    type: "sale",
  });
}
