import { DocumentSlug } from "@/lib/documents/document-types";

export const DOCUMENT_JOB_STATUSES = ["pending", "processing", "done", "failed"] as const;

export type DocumentJobStatus = (typeof DOCUMENT_JOB_STATUSES)[number];

export type DocumentAggregateType = "work_order" | "quote" | "warranty";

export type DocumentGenerationJob = {
  id: string;
  companyId: string;
  triggerEventId?: string;
  aggregateType: DocumentAggregateType;
  aggregateId: string;
  requestedSlugs: DocumentSlug[];
  completedSlugs: DocumentSlug[];
  status: DocumentJobStatus;
  attempts: number;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
};

export type DocumentInstance = {
  id: string;
  companyId: string;
  aggregateType: DocumentAggregateType;
  aggregateId: string;
  slug: DocumentSlug;
  type: string;
  title: string;
  version: number;
  theme: string;
  storagePath?: string;
  downloadUrl?: string;
  contextSnapshotHash?: string;
  supersedesInstanceId?: string;
  generatedAt: Date;
};

export type CreateDocumentJobInput = Omit<
  DocumentGenerationJob,
  "id" | "completedSlugs" | "status" | "attempts" | "createdAt" | "completedAt" | "error"
> & {
  id?: string;
};
