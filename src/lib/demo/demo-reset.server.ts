import "server-only";

import type { CollectionReference, Firestore } from "firebase-admin/firestore";

import { DEMO_COMPANY_ID } from "@/lib/demo/demo-config";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";

const BATCH_SIZE = 400;
const DELETE_CONCURRENCY = 8;

const COMPANY_MUTABLE_SUBCOLLECTIONS = [
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
] as const;

/** Only these typically grow nested docs. Skip listCollections elsewhere. */
const NESTED_COMPANY_SUBCOLLECTIONS = new Set([
  "workOrders",
  "documentGenerationJobs",
  "documentInstances",
  "workOrderDocuments",
  "documents",
]);

const NESTED_TOP_LEVEL = new Set(["inventoryImports", "motorImports", "motors"]);

async function mapPool<T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<number>,
): Promise<number> {
  if (items.length === 0) return 0;
  let cursor = 0;
  let deleted = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      deleted += await worker(items[index]!);
    }
  });
  await Promise.all(workers);
  return deleted;
}

async function deleteCollectionRecursive(
  db: Firestore,
  collectionRef: CollectionReference,
  inspectSubcollections: boolean,
): Promise<number> {
  let deleted = 0;

  while (true) {
    const snapshot = await collectionRef.limit(BATCH_SIZE).get();
    if (snapshot.empty) break;

    if (inspectSubcollections) {
      for (const docSnap of snapshot.docs) {
        const subcollections = await docSnap.ref.listCollections();
        for (const subcollection of subcollections) {
          deleted += await deleteCollectionRecursive(db, subcollection, true);
        }
      }
    }

    const batch = db.batch();
    for (const docSnap of snapshot.docs) {
      batch.delete(docSnap.ref);
    }
    await batch.commit();
    deleted += snapshot.size;
  }

  return deleted;
}

async function deleteTopLevelByCompanyId(
  db: Firestore,
  collectionName: string,
): Promise<number> {
  let deleted = 0;
  const inspectSubcollections = NESTED_TOP_LEVEL.has(collectionName);

  while (true) {
    const snapshot = await db
      .collection(collectionName)
      .where("companyId", "==", DEMO_COMPANY_ID)
      .limit(BATCH_SIZE)
      .get();

    if (snapshot.empty) break;

    if (inspectSubcollections) {
      for (const docSnap of snapshot.docs) {
        const subcollections = await docSnap.ref.listCollections();
        for (const subcollection of subcollections) {
          deleted += await deleteCollectionRecursive(db, subcollection, true);
        }
      }
    }

    const batch = db.batch();
    for (const docSnap of snapshot.docs) {
      batch.delete(docSnap.ref);
    }
    await batch.commit();
    deleted += snapshot.size;
  }

  return deleted;
}

async function deleteDemoEmployeesExceptOwner(db: Firestore, ownerUid: string): Promise<number> {
  const employeesRef = db.collection("companies").doc(DEMO_COMPANY_ID).collection("employees");
  const snapshot = await employeesRef.get();
  const refs = snapshot.docs.filter((doc) => doc.id !== ownerUid).map((doc) => doc.ref);
  if (refs.length === 0) return 0;

  const batch = db.batch();
  for (const ref of refs) {
    batch.delete(ref);
  }
  await batch.commit();
  return refs.length;
}

async function deleteDemoInvites(db: Firestore): Promise<number> {
  return deleteTopLevelByCompanyId(db, "invites");
}

async function deleteDemoUserMotors(db: Firestore, uid: string): Promise<number> {
  return deleteCollectionRecursive(
    db,
    db.collection("users").doc(uid).collection("motors"),
    false,
  );
}

/** Wipes mutable demo workspace data. Keeps company shell, roles, billing, and owner profile. */
export async function resetDemoWorkspaceData(ownerUid: string): Promise<{ deleted: number }> {
  const db = getAdminFirestore();
  const companyRef = db.collection("companies").doc(DEMO_COMPANY_ID);

  const deleted = await mapPool(
    [
      ...COMPANY_MUTABLE_SUBCOLLECTIONS.map(
        (name) => () =>
          deleteCollectionRecursive(
            db,
            companyRef.collection(name),
            NESTED_COMPANY_SUBCOLLECTIONS.has(name),
          ),
      ),
      () => deleteDemoEmployeesExceptOwner(db, ownerUid),
      ...TOP_LEVEL_COMPANY_SCOPED.map((name) => () => deleteTopLevelByCompanyId(db, name)),
      () => deleteDemoInvites(db),
      () => deleteDemoUserMotors(db, ownerUid),
    ],
    DELETE_CONCURRENCY,
    (task) => task(),
  );

  return { deleted };
}
