import "server-only";

import { MotorImportJob } from "@/domain/motor-import";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";

const BATCH_SIZE = 400;

export type MotorImportRollbackSnapshot = NonNullable<MotorImportJob["rollbackSnapshot"]>;

export async function rollbackMotorImportPartialApply(params: {
  uid: string;
  snapshot: MotorImportRollbackSnapshot;
}): Promise<{ deletedMotors: number; deletedEngines: number; deletedBrands: number }> {
  const db = getAdminFirestore();
  let deletedMotors = 0;
  let deletedEngines = 0;
  let deletedBrands = 0;

  const motorIds = [...new Set(params.snapshot.createdMotorIds ?? [])];
  for (let index = 0; index < motorIds.length; index += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = motorIds.slice(index, index + BATCH_SIZE);
    for (const motorId of chunk) {
      batch.delete(db.collection("users").doc(params.uid).collection("motors").doc(motorId));
    }
    await batch.commit();
    deletedMotors += chunk.length;
  }

  for (const engineId of [...new Set(params.snapshot.createdEngineIds ?? [])]) {
    try {
      await db.collection("engines").doc(engineId).delete();
      deletedEngines += 1;
    } catch {
      // Best-effort rollback.
    }
  }

  for (const brandId of [...new Set(params.snapshot.createdBrandIds ?? [])]) {
    try {
      await db.collection("brands").doc(brandId).delete();
      deletedBrands += 1;
    } catch {
      // Best-effort rollback.
    }
  }

  return { deletedMotors, deletedEngines, deletedBrands };
}

export function hasMotorImportRollbackWork(snapshot: MotorImportRollbackSnapshot | undefined): boolean {
  if (!snapshot) return false;
  return (
    (snapshot.createdMotorIds?.length ?? 0) > 0 ||
    (snapshot.createdBrandIds?.length ?? 0) > 0 ||
    (snapshot.createdEngineIds?.length ?? 0) > 0
  );
}
