import "server-only";

import { FieldPath, type Firestore, type QueryDocumentSnapshot } from "firebase-admin/firestore";

const DEFAULT_PAGE_SIZE = 200;

export type PageCompanyIdsResult = {
  companyIds: string[];
  pages: number;
};

/**
 * Walk every `companies/{id}` document. Callers used to `.limit(200)`, which
 * silently skipped tenants after the first page.
 */
export async function pageAllCompanyIds(
  db: Firestore,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<PageCompanyIdsResult> {
  const size = Math.max(1, Math.min(pageSize, 500));
  const companyIds: string[] = [];
  let pages = 0;
  let cursor: QueryDocumentSnapshot | undefined;

  for (;;) {
    let query = db.collection("companies").orderBy(FieldPath.documentId()).limit(size);
    if (cursor) query = query.startAfter(cursor);
    const snap = await query.get();
    if (snap.empty) break;
    pages += 1;
    for (const doc of snap.docs) {
      const id = doc.id.trim();
      if (id) companyIds.push(id);
    }
    if (snap.size < size) break;
    cursor = snap.docs[snap.docs.length - 1];
  }

  return { companyIds, pages };
}
