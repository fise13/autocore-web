import "server-only";

import type { CollectionReference, Firestore } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { AI_GUIDE_COMPANY_ID } from "@/lib/playground/ai-guide/config";
import { ensureAiGuideWorkspace } from "@/lib/playground/ai-guide/provision.server";

const BATCH_SIZE = 400;

const COMPANY_SUBCOLLECTIONS = [
  "activityLogs",
  "clients",
  "vehicles",
  "workOrders",
  "quotes",
  "warranties",
  "payrollTransactions",
  "domainEvents",
  "documentGenerationJobs",
  "documentInstances",
  "workOrderDocuments",
  "documents",
  "settings",
  "meta",
] as const;

const TOP_LEVEL_COMPANY_SCOPED = [
  "financialOperations",
  "operations",
  "motors",
  "specificRecords",
  "specificCategories",
  "inventoryItems",
  "inventoryMovements",
  "inventoryStockLevels",
  "inventoryReservations",
  "barcodeMappings",
  "warehouses",
  "suppliers",
  "warehousePresence",
  "inventoryImports",
  "motorImports",
  "invites",
] as const;

async function deleteCollection(collectionRef: CollectionReference): Promise<number> {
  let deleted = 0;
  while (true) {
    const snapshot = await collectionRef.limit(BATCH_SIZE).get();
    if (snapshot.empty) break;
    const batch = collectionRef.firestore.batch();
    for (const docSnap of snapshot.docs) batch.delete(docSnap.ref);
    await batch.commit();
    deleted += snapshot.size;
  }
  return deleted;
}

async function deleteTopLevelByCompanyId(db: Firestore, collectionName: string): Promise<number> {
  let deleted = 0;
  while (true) {
    const snapshot = await db
      .collection(collectionName)
      .where("companyId", "==", AI_GUIDE_COMPANY_ID)
      .limit(BATCH_SIZE)
      .get();
    if (snapshot.empty) break;
    const batch = db.batch();
    for (const docSnap of snapshot.docs) batch.delete(docSnap.ref);
    await batch.commit();
    deleted += snapshot.size;
  }
  return deleted;
}

/**
 * Wipes Ridgeway playground data and re-seeds it. Hard-coded to
 * `AI_GUIDE_COMPANY_ID` — never accepts a company id from the caller.
 */
export async function resetAiGuideWorkspace(ownerUid: string): Promise<{ deleted: number }> {
  const db = getAdminFirestore();
  const companyRef = db.collection("companies").doc(AI_GUIDE_COMPANY_ID);

  let deleted = 0;
  for (const name of COMPANY_SUBCOLLECTIONS) {
    deleted += await deleteCollection(companyRef.collection(name));
  }
  for (const name of TOP_LEVEL_COMPANY_SCOPED) {
    deleted += await deleteTopLevelByCompanyId(db, name);
  }

  const employeesSnap = await companyRef.collection("employees").get();
  if (!employeesSnap.empty) {
    const batch = db.batch();
    for (const docSnap of employeesSnap.docs) {
      if (docSnap.id !== ownerUid) batch.delete(docSnap.ref);
    }
    await batch.commit();
    deleted += Math.max(0, employeesSnap.size - 1);
  }

  deleted += await deleteCollection(db.collection("users").doc(ownerUid).collection("motors"));
  await ensureAiGuideWorkspace(ownerUid);
  return { deleted };
}
