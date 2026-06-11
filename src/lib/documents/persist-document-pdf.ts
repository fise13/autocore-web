import "server-only";

import { Timestamp } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import {
  isStorageBucketMissingError,
  resolveAdminStorageBucket,
} from "@/infrastructure/firebase/resolve-storage-bucket";
import { WorkOrderDocument, WorkOrderDocumentType } from "@/domain/work-order";
import { DOCUMENT_BY_TYPE } from "@/lib/documents/document-types";
import { normalizeCompanyId } from "@/lib/company-id";

const COLLECTION = "workOrderDocuments";

function storagePathFor(companyId: string, workOrderId: string, type: WorkOrderDocumentType): string {
  return `companies/${normalizeCompanyId(companyId)}/workOrders/${workOrderId}/documents/${type}.pdf`;
}

export async function uploadDocumentPdf(params: {
  companyId: string;
  workOrderId: string;
  type: WorkOrderDocumentType;
  pdf: Buffer;
}): Promise<{ storagePath: string; downloadUrl: string }> {
  const storagePath = storagePathFor(params.companyId, params.workOrderId, params.type);
  const bucket = await resolveAdminStorageBucket();
  const file = bucket.file(storagePath);

  await file.save(params.pdf, {
    contentType: "application/pdf",
    metadata: {
      cacheControl: "public, max-age=3600",
    },
    resumable: false,
  });

  await file.makePublic().catch(() => undefined);

  const [signedUrl] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 1000 * 60 * 60 * 24 * 365,
  });

  return { storagePath, downloadUrl: signedUrl };
}

export async function upsertWorkOrderDocumentMetadata(params: {
  companyId: string;
  workOrderId: string;
  type: WorkOrderDocumentType;
  storagePath: string;
  downloadUrl: string;
}): Promise<WorkOrderDocument> {
  const db = getAdminFirestore();
  const normalizedCompanyId = normalizeCompanyId(params.companyId);
  const collectionRef = db.collection("companies").doc(normalizedCompanyId).collection(COLLECTION);

  const existing = await collectionRef
    .where("workOrderId", "==", params.workOrderId)
    .where("type", "==", params.type)
    .limit(1)
    .get();

  const definition = DOCUMENT_BY_TYPE[params.type];
  const payload = {
    companyId: normalizedCompanyId,
    workOrderId: params.workOrderId,
    type: params.type,
    title: definition.title,
    storagePath: params.storagePath,
    downloadUrl: params.downloadUrl,
    createdAt: Timestamp.fromDate(new Date()),
  };

  if (!existing.empty) {
    const docRef = existing.docs[0].ref;
    await docRef.set(payload, { merge: true });
    return {
      id: docRef.id,
      companyId: normalizedCompanyId,
      workOrderId: params.workOrderId,
      type: params.type,
      title: definition.title,
      storagePath: params.storagePath,
      downloadUrl: params.downloadUrl,
      createdAt: new Date(),
    };
  }

  const docRef = await collectionRef.add(payload);
  return {
    id: docRef.id,
    companyId: normalizedCompanyId,
    workOrderId: params.workOrderId,
    type: params.type,
    title: definition.title,
    storagePath: params.storagePath,
    downloadUrl: params.downloadUrl,
    createdAt: new Date(),
  };
}

export async function persistDocumentPdf(params: {
  companyId: string;
  workOrderId: string;
  type: WorkOrderDocumentType;
  pdf: Buffer;
}): Promise<WorkOrderDocument> {
  try {
    const uploaded = await uploadDocumentPdf(params);
    return upsertWorkOrderDocumentMetadata({
      companyId: params.companyId,
      workOrderId: params.workOrderId,
      type: params.type,
      storagePath: uploaded.storagePath,
      downloadUrl: uploaded.downloadUrl,
    });
  } catch (error) {
    if (!isStorageBucketMissingError(error)) {
      throw error;
    }

    // Storage bucket is not provisioned — keep metadata so PDF is served on demand via /api/pdf.
    return upsertWorkOrderDocumentMetadata({
      companyId: params.companyId,
      workOrderId: params.workOrderId,
      type: params.type,
      storagePath: "",
      downloadUrl: "",
    });
  }
}
