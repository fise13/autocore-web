import { getDocs, query, where, collection } from "firebase/firestore";

import { FinancialOperationRepository } from "@/infrastructure/firestore/financial-operation-repository";
import { InventoryImportRepository } from "@/infrastructure/firestore/inventory-import-repository";
import { InventoryItemRepository } from "@/infrastructure/firestore/inventory-item-repository";
import { InventoryMovementRepository } from "@/infrastructure/firestore/inventory-movement-repository";
import { InventoryStockLevelRepository } from "@/infrastructure/firestore/inventory-stock-level-repository";
import { getFirestoreDb } from "@/infrastructure/firebase/client";
import { normalizeCompanyId } from "@/lib/company-id";

import { reverseMovementUseCase } from "./reverse-movement";

export async function rollbackImportJobUseCase(
  importRepository: InventoryImportRepository,
  itemRepository: InventoryItemRepository,
  stockLevelRepository: InventoryStockLevelRepository,
  movementRepository: InventoryMovementRepository,
  financialRepository: FinancialOperationRepository,
  params: {
    companyId: string;
    jobId: string;
    actorUserId: string;
  },
) {
  const job = await importRepository.getById(params.jobId);
  if (!job) throw new Error("Import not found");
  if (job.companyId !== normalizeCompanyId(params.companyId)) {
    throw new Error("This import belongs to a different company");
  }
  if (job.status !== "completed") {
    throw new Error("Only completed imports can be rolled back");
  }
  if (!job.rollbackMovementIds?.length) {
    throw new Error("There are no movements to roll back");
  }

  let reversed = 0;
  let failed = 0;
  const db = getFirestoreDb();

  for (const movementId of job.rollbackMovementIds) {
    try {
      await reverseMovementUseCase(itemRepository, stockLevelRepository, movementRepository, {
        companyId: params.companyId,
        movementId,
        actorUserId: params.actorUserId,
        reason: `Откат импорта: ${job.sourceFileName ?? params.jobId}`,
      });

      const relatedOps = await getDocs(
        query(
          collection(db, "financialOperations"),
          where("companyId", "==", normalizeCompanyId(params.companyId)),
          where("relatedMovementId", "==", movementId),
        ),
      );
      for (const opDoc of relatedOps.docs) {
        await financialRepository.remove(opDoc.id, {
          companyId: params.companyId,
          actorUid: params.actorUserId,
        });
      }

      reversed += 1;
    } catch {
      failed += 1;
    }
  }

  await importRepository.markRolledBack(params.jobId, params.companyId, params.actorUserId, {
    reversed,
    failed,
  });

  return { reversed, failed };
}
