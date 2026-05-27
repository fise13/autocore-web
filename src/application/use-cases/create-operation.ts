import { CreateFinancialOperationInput } from "@/domain/financial-operation";
import { createFinancialOperationSchema } from "@/domain/schemas";
import { FinancialOperationRepository } from "@/infrastructure/firestore/financial-operation-repository";

export async function createOperationUseCase(
  repository: FinancialOperationRepository,
  payload: CreateFinancialOperationInput,
) {
  const input = createFinancialOperationSchema.parse(payload);
  return repository.create(input);
}
