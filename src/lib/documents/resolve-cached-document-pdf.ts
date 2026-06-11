import "server-only";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { DOCUMENT_BY_SLUG, DocumentSlug } from "@/lib/documents/document-types";
import { normalizeCompanyId } from "@/lib/company-id";

export async function readCachedWorkOrderPdf(params: {
  companyId: string;
  workOrderId: string;
  slug: DocumentSlug;
}): Promise<Buffer | null> {
  const definition = DOCUMENT_BY_SLUG[params.slug];
  if (!definition) return null;

  const db = getAdminFirestore();
  const normalizedCompanyId = normalizeCompanyId(params.companyId);
  const snapshot = await db
    .collection("companies")
    .doc(normalizedCompanyId)
    .collection("workOrderDocuments")
    .where("workOrderId", "==", params.workOrderId)
    .where("type", "==", definition.type)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const downloadUrl = String(snapshot.docs[0].data().downloadUrl ?? "").trim();
  if (!downloadUrl) return null;

  const response = await fetch(downloadUrl, { cache: "no-store" });
  if (!response.ok) return null;

  const bytes = Buffer.from(await response.arrayBuffer());
  return bytes.length > 0 ? bytes : null;
}
