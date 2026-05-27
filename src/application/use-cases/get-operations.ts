import {
  FinancialOperationsFilters,
  FinancialOperationRepository,
} from "@/infrastructure/firestore/financial-operation-repository";

export function getOperationsUseCase(
  repository: FinancialOperationRepository,
  filters: FinancialOperationsFilters,
  onData: Parameters<FinancialOperationRepository["subscribe"]>[1],
  onError?: Parameters<FinancialOperationRepository["subscribe"]>[2],
) {
  return repository.subscribe(filters, onData, onError);
}
